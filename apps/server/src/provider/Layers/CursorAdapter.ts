/**
 * CursorAdapter: drives the user's own `agent` CLI on the legacy adapter bridge, one tracked
 * child process per turn. Cursor's print mode cannot ask for approval, so the session's runtime
 * mode picks read-only (`--mode ask`) or, only for `full-access`, `--force`. Bot identity and
 * memory are prepended to the prompt; nothing is ever written into the workspace.
 *
 * @module provider/Layers/CursorAdapter
 */
import {
  EventId,
  ProviderInstanceId,
  RuntimeItemId,
  ThreadId,
  TurnId,
  type CursorSettings,
  type ProviderRuntimeEvent,
  type ProviderSession,
  type RuntimeMode,
} from "@isnadi/contracts";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/unstable/process";
import { resolveSpawnCommand } from "@isnadi/shared/shell";

import {
  ProviderAdapterRequestError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
} from "../Errors.ts";
import type { CursorAdapterShape } from "../Services/CursorAdapter.ts";
import { buildCursorTurnArgs } from "./cursor/CursorTurnArgs.ts";
import {
  createCursorRuntimeMapper,
  type CursorRuntimeDraft,
} from "./cursor/CursorRuntimeMapping.ts";
import { startCursorTurn } from "./cursor/CursorTurnRunner.ts";

const PROVIDER = "cursor" as const;

/** What we keep to resume a Cursor chat: the `session_id` its `system.init` event reports. */
const ResumeCursor = Schema.Struct({ sessionId: Schema.String });

const decodeResumeCursor = Schema.decodeUnknownOption(ResumeCursor);

export interface CursorAdapterOptions {
  readonly instanceId?: ProviderInstanceId;
  readonly environment?: NodeJS.ProcessEnv;
}

interface ActiveTurn {
  readonly turnId: TurnId;
  readonly interrupt: Effect.Effect<void>;
}

interface CursorSessionContext {
  session: ProviderSession;
  readonly cwd: string;
  readonly runtimeMode: RuntimeMode;
  readonly model: string | undefined;
  active: ActiveTurn | undefined;
}

const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

export const makeCursorAdapter = Effect.fn("makeCursorAdapter")(function* (
  settings: CursorSettings,
  options?: CursorAdapterOptions,
) {
  const boundInstanceId = options?.instanceId ?? ProviderInstanceId.make("cursor");
  const environment = options?.environment ?? process.env;
  const crypto = yield* Crypto.Crypto;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const scope = yield* Effect.scope;

  const runtimeEvents = yield* Queue.unbounded<ProviderRuntimeEvent>();
  const sessions = new Map<ThreadId, CursorSessionContext>();

  yield* Effect.addFinalizer(() => Queue.shutdown(runtimeEvents));

  const uuid = crypto.randomUUIDv4.pipe(
    Effect.mapError(
      (cause) =>
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "crypto/randomUUIDv4",
          detail: "Failed to generate a Cursor runtime identifier.",
          cause,
        }),
    ),
  );

  const eventBase = (input: {
    readonly threadId: ThreadId;
    readonly turnId?: TurnId;
    readonly itemId?: string;
  }) =>
    Effect.all({ eventId: uuid.pipe(Effect.map(EventId.make)), createdAt: nowIso }).pipe(
      Effect.map(({ eventId, createdAt }) => ({
        eventId,
        provider: PROVIDER,
        threadId: input.threadId,
        createdAt,
        ...(input.turnId ? { turnId: input.turnId } : {}),
        ...(input.itemId ? { itemId: RuntimeItemId.make(input.itemId) } : {}),
      })),
    );

  const emit = (event: ProviderRuntimeEvent) => Queue.offer(runtimeEvents, event);

  const emitDraft = (threadId: ThreadId, turnId: TurnId, draft: CursorRuntimeDraft) =>
    Effect.gen(function* () {
      const base = yield* eventBase({
        threadId,
        turnId,
        ...("itemId" in draft ? { itemId: draft.itemId } : {}),
      });

      switch (draft.type) {
        case "content.delta":
          return yield* emit({ ...base, type: "content.delta", payload: draft.payload });
        case "item.started":
          return yield* emit({ ...base, type: "item.started", payload: draft.payload });
        case "item.completed":
          return yield* emit({ ...base, type: "item.completed", payload: draft.payload });
        case "thread.metadata.updated":
          return yield* emit({ ...base, type: "thread.metadata.updated", payload: draft.payload });
      }
    });

  const requireContext = (threadId: ThreadId) => {
    const context = sessions.get(threadId);

    return context
      ? Effect.succeed(context)
      : Effect.fail(new ProviderAdapterSessionNotFoundError({ provider: PROVIDER, threadId }));
  };

  const touch = (
    context: CursorSessionContext,
    patch: Partial<ProviderSession>,
    updatedAt: string,
  ) => {
    context.session = { ...context.session, ...patch, updatedAt };
  };

  const startSession: CursorAdapterShape["startSession"] = Effect.fn("startSession")(
    function* (input) {
      if (input.provider !== undefined && input.provider !== PROVIDER) {
        return yield* new ProviderAdapterValidationError({
          provider: PROVIDER,
          operation: "startSession",
          issue: `Expected provider '${PROVIDER}' but received '${input.provider}'.`,
        });
      }

      if (input.cwd === undefined) {
        return yield* new ProviderAdapterValidationError({
          provider: PROVIDER,
          operation: "startSession",
          issue: "Cursor needs a workspace directory to run in.",
        });
      }

      const now = yield* nowIso;
      const model = input.modelSelection?.model;

      const session: ProviderSession = {
        provider: PROVIDER,
        providerInstanceId: boundInstanceId,
        status: "ready",
        runtimeMode: input.runtimeMode,
        cwd: input.cwd,
        ...(model !== undefined ? { model } : {}),
        threadId: input.threadId,
        ...(input.resumeCursor !== undefined ? { resumeCursor: input.resumeCursor } : {}),
        createdAt: now,
        updatedAt: now,
      };

      sessions.set(input.threadId, {
        session,
        cwd: input.cwd,
        runtimeMode: input.runtimeMode,
        model,
        active: undefined,
      });

      yield* emit({
        ...(yield* eventBase({ threadId: input.threadId })),
        type: "session.started",
        payload: { message: "Cursor session started" },
      });

      return session;
    },
  );

  const runTurn = (
    context: CursorSessionContext,
    turnId: TurnId,
    prompt: string,
    model: string | undefined,
  ) =>
    Effect.gen(function* () {
      const threadId = context.session.threadId;
      const resume = Option.getOrUndefined(decodeResumeCursor(context.session.resumeCursor));

      const args = buildCursorTurnArgs({
        cwd: context.cwd,
        prompt,
        runtimeMode: context.runtimeMode,
        model,
        resumeSessionId: resume?.sessionId,
      });

      const command = settings.binaryPath || "agent";
      const spawnCommand = yield* resolveSpawnCommand(command, args, { env: environment });

      const turn = yield* startCursorTurn({
        command: spawnCommand.command,
        args: spawnCommand.args,
        cwd: context.cwd,
        env: environment,
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));

      context.active = { turnId, interrupt: turn.interrupt };

      const mapper = createCursorRuntimeMapper();

      yield* turn.events.pipe(
        Stream.runForEach((event) =>
          Effect.forEach(mapper.map(event), (draft) => emitDraft(threadId, turnId, draft), {
            discard: true,
          }),
        ),
      );

      yield* Effect.forEach(mapper.flush(), (draft) => emitDraft(threadId, turnId, draft), {
        discard: true,
      });

      const result = yield* turn.result;
      const updatedAt = yield* nowIso;

      context.active = undefined;

      touch(
        context,
        {
          status: result.outcome === "failed" ? "error" : "ready",
          ...(result.sessionId !== undefined
            ? { resumeCursor: { sessionId: result.sessionId } }
            : {}),
          ...(result.outcome === "failed" && result.message !== undefined
            ? { lastError: result.message }
            : {}),
        },
        updatedAt,
      );

      if (result.outcome === "interrupted") {
        return yield* emit({
          ...(yield* eventBase({ threadId, turnId })),
          type: "turn.aborted",
          payload: { reason: "Interrupted by user." },
        });
      }

      if (result.outcome === "failed") {
        yield* emit({
          ...(yield* eventBase({ threadId, turnId })),
          type: "runtime.error",
          payload: {
            message: result.message ?? `Cursor exited with code ${result.exitCode}.`,
            class: "provider_error",
          },
        });
      }

      yield* emit({
        ...(yield* eventBase({ threadId, turnId })),
        type: "turn.completed",
        payload:
          result.outcome === "completed"
            ? { state: "completed", ...(result.usage ? { usage: result.usage } : {}) }
            : {
                state: "failed",
                errorMessage: result.message ?? `Cursor exited with code ${result.exitCode}.`,
              },
      });
    }).pipe(
      // A spawn failure (binary gone, ...) ends the turn instead of leaving it running forever.
      Effect.catchCause((cause) =>
        Effect.gen(function* () {
          const threadId = context.session.threadId;
          const message = "Failed to run the Cursor CLI.";

          context.active = undefined;
          touch(context, { status: "error", lastError: message }, yield* nowIso);
          yield* Effect.logWarning(message, { cause });
          yield* emit({
            ...(yield* eventBase({ threadId, turnId })),
            type: "turn.completed",
            payload: { state: "failed", errorMessage: message },
          });
        }),
      ),
      Effect.scoped,
    );

  const sendTurn: CursorAdapterShape["sendTurn"] = Effect.fn("sendTurn")(function* (input) {
    const context = yield* requireContext(input.threadId);

    if (context.active !== undefined) {
      return yield* new ProviderAdapterValidationError({
        provider: PROVIDER,
        operation: "sendTurn",
        issue: "Cursor runs one turn at a time; wait for the current turn or interrupt it.",
      });
    }

    if ((input.attachments?.length ?? 0) > 0) {
      return yield* new ProviderAdapterValidationError({
        provider: PROVIDER,
        operation: "sendTurn",
        issue: "Cursor does not support attachments yet.",
      });
    }

    const text = input.input?.trim() ?? "";

    if (text.length === 0) {
      return yield* new ProviderAdapterValidationError({
        provider: PROVIDER,
        operation: "sendTurn",
        issue: "Cursor turns require text input.",
      });
    }

    if (input.modelSelection !== undefined && input.modelSelection.instanceId !== boundInstanceId) {
      return yield* new ProviderAdapterValidationError({
        provider: PROVIDER,
        operation: "sendTurn",
        issue: `Cursor model selection is bound to instance '${input.modelSelection.instanceId}', expected '${boundInstanceId}'.`,
      });
    }

    const turnId = TurnId.make(`cursor-turn-${yield* uuid}`);
    const model = input.modelSelection?.model ?? context.model;

    // Identity and memory go in front of the user's message: Cursor has no system-prompt flag.
    const prompt =
      input.persistentMemoryContext !== undefined && input.persistentMemoryContext.trim().length > 0
        ? `${input.persistentMemoryContext.trim()}\n\n${text}`
        : text;

    // Claim the turn before forking so a second sendTurn cannot slip in.
    context.active = { turnId, interrupt: Effect.void };
    touch(
      context,
      { status: "running", activeTurnId: turnId, ...(model ? { model } : {}) },
      yield* nowIso,
    );

    yield* emit({
      ...(yield* eventBase({ threadId: input.threadId, turnId })),
      type: "turn.started",
      payload: model ? { model } : {},
    });

    yield* runTurn(context, turnId, prompt, model).pipe(Effect.forkIn(scope));

    return {
      threadId: input.threadId,
      turnId,
      ...(context.session.resumeCursor !== undefined
        ? { resumeCursor: context.session.resumeCursor }
        : {}),
    };
  });

  const interruptTurn: CursorAdapterShape["interruptTurn"] = Effect.fn("interruptTurn")(
    function* (threadId) {
      const context = yield* requireContext(threadId);

      if (context.active !== undefined) yield* context.active.interrupt;
    },
  );

  const stopSession: CursorAdapterShape["stopSession"] = Effect.fn("stopSession")(
    function* (threadId) {
      const context = yield* requireContext(threadId);

      sessions.delete(threadId);

      if (context.active !== undefined) yield* context.active.interrupt;

      yield* emit({
        ...(yield* eventBase({ threadId })),
        type: "session.exited",
        payload: { reason: "Session stopped.", recoverable: false, exitKind: "graceful" },
      });
    },
  );

  const rejectUnsupported = (method: string, detail: string) =>
    Effect.fail(new ProviderAdapterRequestError({ provider: PROVIDER, method, detail }));

  return {
    provider: PROVIDER,
    capabilities: { sessionModelSwitch: "in-session" },
    startSession,
    sendTurn,
    interruptTurn,
    // Print mode never asks, so there is no request or question to answer.
    respondToRequest: () =>
      rejectUnsupported("respondToRequest", "Cursor never asks for approval in print mode."),
    respondToUserInput: () =>
      rejectUnsupported("respondToUserInput", "Cursor does not ask for user input in print mode."),
    stopSession,
    listSessions: () => Effect.sync(() => [...sessions.values()].map((context) => context.session)),
    hasSession: (threadId) => Effect.sync(() => sessions.has(threadId)),
    readThread: (threadId) =>
      requireContext(threadId).pipe(Effect.map(() => ({ threadId, turns: [] }))),
    // Cursor has no native revert; Isnadi's own checkpoint refs are unaffected.
    rollbackThread: (threadId) =>
      requireContext(threadId).pipe(
        Effect.andThen(
          rejectUnsupported(
            "thread/rollback",
            "Cursor sessions do not support provider-side rollback.",
          ),
        ),
      ),
    stopAll: () =>
      Effect.gen(function* () {
        const contexts = [...sessions.values()];

        sessions.clear();
        yield* Effect.forEach(contexts, (context) => context.active?.interrupt ?? Effect.void, {
          discard: true,
        });
      }),
    get streamEvents() {
      return Stream.fromQueue(runtimeEvents);
    },
  } satisfies CursorAdapterShape;
});
