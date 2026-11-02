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
  ProviderDriverKind,
  ProviderInstanceId,
  RuntimeItemId,
  ThreadId,
  TurnId,
  type CursorSettings,
  type ProviderRuntimeEvent,
  type ProviderSession,
  type RuntimeMode,
} from "@isnadi/contracts";
import * as Cause from "effect/Cause";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { resolveSpawnCommand } from "@isnadi/shared/shell";

import {
  ProviderAdapterRequestError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
} from "../Errors.ts";
import { spawnAndCollect } from "../providerSnapshot.ts";
import type { CursorAdapterShape } from "../Services/CursorAdapter.ts";
import { buildCursorTurnArgs } from "./cursor/CursorTurnArgs.ts";
import {
  createCursorRuntimeMapper,
  type CursorRuntimeDraft,
} from "./cursor/CursorRuntimeMapping.ts";
import { startCursorTurn } from "./cursor/CursorTurnRunner.ts";

const PROVIDER = ProviderDriverKind.make("cursor");

/** What we keep to resume a Cursor chat: the `session_id` its `system.init` event reports. */
const ResumeCursor = Schema.Struct({ sessionId: Schema.String });

const decodeResumeCursor = Schema.decodeUnknownOption(ResumeCursor);

export interface CursorAdapterOptions {
  readonly instanceId?: ProviderInstanceId;
  readonly environment?: NodeJS.ProcessEnv;
}

/**
 * The turn that is running. `interrupt` does nothing until the child is spawned, so a Stop that
 * arrives earlier is recorded in `stopRequested` and honoured right after (or instead of) the spawn.
 */
interface ActiveTurn {
  readonly turnId: TurnId;
  stopRequested: boolean;
  interrupt: Effect.Effect<void>;
  fiber: Fiber.Fiber<void, unknown> | undefined;
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

  const requireContext = Effect.fn("requireContext")(function* (threadId: ThreadId) {
    const context = sessions.get(threadId);

    if (!context) {
      return yield* new ProviderAdapterSessionNotFoundError({ provider: PROVIDER, threadId });
    }

    return context;
  });

  const touch = (
    context: CursorSessionContext,
    patch: Partial<ProviderSession>,
    updatedAt: string,
  ) => {
    context.session = { ...context.session, ...patch, updatedAt };
  };

  /** A chat id minted without a model call, so the first turn can already `--resume` it. */
  const createChat = (cwd: string) =>
    Effect.gen(function* () {
      const command = settings.binaryPath || "agent";

      const spawnCommand = yield* resolveSpawnCommand(command, ["create-chat"], {
        env: environment,
      });

      const output = yield* spawnAndCollect(
        command,
        ChildProcess.make(spawnCommand.command, spawnCommand.args, {
          cwd,
          env: environment,
          extendEnv: true,
          shell: spawnCommand.shell,
        }),
      ).pipe(Effect.timeoutOption("10 seconds"));

      const id =
        Option.isSome(output) && output.value.code === 0
          ? output.value.stdout.trim().split(/\r?\n/).at(-1)?.trim()
          : undefined;

      return id !== undefined && /^[\w-]{8,}$/.test(id) ? id : undefined;
    }).pipe(
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      Effect.catchCause((cause) =>
        Effect.logWarning("Cursor create-chat failed; the first turn starts a fresh chat.", {
          cause,
        }).pipe(Effect.as(undefined)),
      ),
    );

  /**
   * Ends a turn on the session record: `activeTurnId` and a previous `lastError` are removed, not
   * left stale, because the session is persisted from `listSessions`.
   */
  const endTurnOnSession = (
    context: CursorSessionContext,
    patch: Partial<ProviderSession>,
    updatedAt: string,
  ) => {
    const { activeTurnId: _activeTurnId, lastError: _lastError, ...rest } = context.session;

    context.session = { ...rest, ...patch, updatedAt };
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

      // Cursor only reports its session id during a turn, and the first turn's id would be lost to
      // a restart before turn 2; minting it here makes every turn, the first included, a resume.
      const createdChatId =
        input.resumeCursor === undefined ? yield* createChat(input.cwd) : undefined;

      const resumeCursor =
        input.resumeCursor ??
        (createdChatId !== undefined ? { sessionId: createdChatId } : undefined);

      const session: ProviderSession = {
        provider: PROVIDER,
        providerInstanceId: boundInstanceId,
        status: "ready",
        runtimeMode: input.runtimeMode,
        cwd: input.cwd,
        ...(model !== undefined ? { model } : {}),
        threadId: input.threadId,
        ...(resumeCursor !== undefined ? { resumeCursor } : {}),
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

  const emitAborted = (threadId: ThreadId, turnId: TurnId) =>
    Effect.gen(function* () {
      yield* emit({
        ...(yield* eventBase({ threadId, turnId })),
        type: "turn.aborted",
        payload: { reason: "Interrupted by user." },
      });
    });

  /** Ends a turn that was stopped before its process started. */
  const abortTurn = (context: CursorSessionContext, turnId: TurnId) =>
    Effect.gen(function* () {
      context.active = undefined;
      endTurnOnSession(context, { status: "ready" }, yield* nowIso);
      yield* emitAborted(context.session.threadId, turnId);
    });

  const runTurn = (
    context: CursorSessionContext,
    turnId: TurnId,
    prompt: string,
    model: string | undefined,
  ) =>
    Effect.gen(function* () {
      const threadId = context.session.threadId;

      // Stopped before there was anything to stop: abort without ever starting the process.
      if (context.active?.stopRequested) return yield* abortTurn(context, turnId);

      const resume = Option.getOrUndefined(decodeResumeCursor(context.session.resumeCursor));

      const args = buildCursorTurnArgs({
        cwd: context.cwd,
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
        shell: spawnCommand.shell,
        prompt,
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));

      if (context.active?.turnId === turnId) {
        context.active.interrupt = turn.interrupt;

        // A Stop that came in while the child was starting: honour it now that there is a process.
        if (context.active.stopRequested) yield* turn.interrupt;
      }

      const mapper = createCursorRuntimeMapper();

      yield* turn.events.pipe(
        Stream.runForEach((event) =>
          Effect.gen(function* () {
            // Cursor's session id is the provider thread id, reported once by system.init.
            if (event.type === "session") {
              yield* emit({
                ...(yield* eventBase({ threadId, turnId })),
                type: "thread.started",
                payload: { providerThreadId: event.sessionId },
              });
            }

            yield* Effect.forEach(
              mapper.map(event),
              (draft) => emitDraft(threadId, turnId, draft),
              {
                discard: true,
              },
            );
          }),
        ),
      );

      yield* Effect.forEach(mapper.flush(), (draft) => emitDraft(threadId, turnId, draft), {
        discard: true,
      });

      const result = yield* turn.result;
      const updatedAt = yield* nowIso;

      context.active = undefined;

      endTurnOnSession(
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

      if (result.outcome === "interrupted") return yield* emitAborted(threadId, turnId);

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
      // Failures only: an interrupt (adapter scope closing) is not a failed turn, and the scope
      // already kills the child.
      Effect.catchCauseIf(
        (cause) => !Cause.hasInterruptsOnly(cause),
        (cause) =>
          Effect.gen(function* () {
            const threadId = context.session.threadId;
            const message = "Failed to run the Cursor CLI.";

            context.active = undefined;
            endTurnOnSession(context, { status: "error", lastError: message }, yield* nowIso);
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
    context.active = { turnId, stopRequested: false, interrupt: Effect.void, fiber: undefined };
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

    const fiber = yield* runTurn(context, turnId, prompt, model).pipe(Effect.forkIn(scope));

    if (context.active?.turnId === turnId) context.active.fiber = fiber;

    return {
      threadId: input.threadId,
      turnId,
      ...(context.session.resumeCursor !== undefined
        ? { resumeCursor: context.session.resumeCursor }
        : {}),
    };
  });

  /** Signals the running turn, or records the Stop if its process has not been spawned yet. */
  const requestStop = (context: CursorSessionContext) =>
    Effect.gen(function* () {
      const active = context.active;

      if (active === undefined) return undefined;

      active.stopRequested = true;
      yield* active.interrupt;

      return active;
    });

  const interruptTurn: CursorAdapterShape["interruptTurn"] = Effect.fn("interruptTurn")(
    function* (threadId) {
      yield* requestStop(yield* requireContext(threadId));
    },
  );

  const SETTLE_GRACE = "4 seconds";

  /** Waits for a stopped turn to finish (the 2 s kill grace fits inside), without ever failing. */
  const settle = (active: ActiveTurn | undefined) =>
    active?.fiber === undefined
      ? Effect.void
      : Fiber.join(active.fiber).pipe(Effect.timeoutOption(SETTLE_GRACE), Effect.ignore);

  const stopSession: CursorAdapterShape["stopSession"] = Effect.fn("stopSession")(
    function* (threadId) {
      const context = yield* requireContext(threadId);

      // The turn's own abort comes first; only then does the session exit.
      yield* settle(yield* requestStop(context));
      sessions.delete(threadId);

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
    rollbackThread: (threadId, numTurns) =>
      Effect.gen(function* () {
        yield* requireContext(threadId);

        if (!Number.isInteger(numTurns) || numTurns < 1) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "rollbackThread",
            issue: "numTurns must be an integer >= 1.",
          });
        }

        return yield* rejectUnsupported(
          "thread/rollback",
          "Cursor sessions do not support provider-side rollback.",
        );
      }),
    stopAll: () =>
      Effect.gen(function* () {
        const contexts = [...sessions.values()];

        sessions.clear();
        yield* Effect.forEach(
          contexts,
          (context) => requestStop(context).pipe(Effect.flatMap(settle)),
          {
            concurrency: "unbounded",
            discard: true,
          },
        );
      }),
    get streamEvents() {
      return Stream.fromQueue(runtimeEvents);
    },
  } satisfies CursorAdapterShape;
});
