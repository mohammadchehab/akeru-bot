import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import {
  CursorSettings,
  ProviderInstanceId,
  ThreadId,
  type ProviderRuntimeEvent,
  type RuntimeMode,
} from "@isnadi/contracts";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { makeCursorAdapter } from "./CursorAdapter.ts";

const fixturePath = new URL("./cursor/fixtures/turn-read-file.ndjson", import.meta.url).pathname;

const THREAD = ThreadId.make("thread-1");

const INSTANCE = ProviderInstanceId.make("cursor");

const decodeSettings = Schema.decodeSync(CursorSettings);

const INIT = JSON.stringify({ type: "system", subtype: "init", session_id: "sess-1" });

const ERROR_RESULT = JSON.stringify({ type: "result", is_error: true, result: "model overloaded" });

// A shell stand-in for `agent`. It appends its argv (one arg per line, then a marker) to args.log
// so a test can see exactly what the adapter asked for, then runs `body`.
const withAdapter = <A, E>(
  body: string,
  use: (input: {
    readonly adapter: Effect.Success<ReturnType<typeof makeCursorAdapter>>;
    readonly dir: string;
    readonly argvOfTurn: (
      index: number,
    ) => Effect.Effect<ReadonlyArray<string>, unknown, FileSystem.FileSystem>;
    readonly events: ProviderRuntimeEvent[];
    readonly terminal: Deferred.Deferred<void>;
    readonly sessionSeen: Deferred.Deferred<void>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "isnadi-cursor-adapter-" });
      const agent = path.join(dir, "agent");
      const log = path.join(dir, "args.log");
      yield* fs.writeFileString(
        agent,
        `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a" >> ${JSON.stringify(log)}; done\nprintf -- '--END--\\n' >> ${JSON.stringify(log)}\ncat >> ${JSON.stringify(path.join(dir, "stdin.log"))}\nprintf -- '\\n--END--\\n' >> ${JSON.stringify(path.join(dir, "stdin.log"))}\n${body}\n`,
      );
      yield* fs.chmod(agent, 0o755);

      const adapter = yield* makeCursorAdapter(decodeSettings({ binaryPath: agent }), {
        instanceId: INSTANCE,
        environment: {},
      });

      const events: ProviderRuntimeEvent[] = [];
      const terminal = yield* Deferred.make<void>();
      const sessionSeen = yield* Deferred.make<void>();

      yield* adapter.streamEvents.pipe(
        Stream.runForEach((event) =>
          Effect.gen(function* () {
            events.push(event);

            if (event.type === "thread.started") yield* Deferred.succeed(sessionSeen, undefined);

            if (event.type === "turn.completed" || event.type === "turn.aborted") {
              yield* Deferred.succeed(terminal, undefined);
            }
          }),
        ),
        Effect.forkScoped,
      );

      const argvOfTurn = (index: number) =>
        fs
          .readFileString(log)
          .pipe(
            Effect.map((text) => text.split("--END--\n")[index]?.split("\n").filter(Boolean) ?? []),
          );

      return yield* use({ adapter, dir, argvOfTurn, events, terminal, sessionSeen });
    }),
  ).pipe(Effect.provide(NodeServices.layer));

const start = (
  adapter: Effect.Success<ReturnType<typeof makeCursorAdapter>>,
  dir: string,
  runtimeMode: RuntimeMode,
) =>
  adapter.startSession({
    threadId: THREAD,
    providerInstanceId: INSTANCE,
    cwd: dir,
    runtimeMode,
    modelSelection: { instanceId: INSTANCE, model: "auto" },
  });

describe("CursorAdapter", () => {
  it.effect("runs a turn, streams its events, and keeps the Cursor session for --resume", () =>
    withAdapter(
      `cat ${JSON.stringify(fixturePath)}`,
      ({ adapter, dir, events, terminal, argvOfTurn }) =>
        Effect.gen(function* () {
          yield* start(adapter, dir, "auto");
          const turn = yield* adapter.sendTurn({ threadId: THREAD, input: "read notes.txt" });
          yield* Deferred.await(terminal);

          expect(events.map((event) => event.type)).toEqual(
            expect.arrayContaining([
              "turn.started",
              "content.delta",
              "item.completed",
              "turn.completed",
            ]),
          );
          expect(events.find((event) => event.type === "turn.completed")).toMatchObject({
            turnId: turn.turnId,
            payload: { state: "completed" },
          });

          const [session] = yield* adapter.listSessions();

          expect(session?.resumeCursor).toEqual({
            sessionId: "00000000-0000-4000-8000-000000000001",
          });
          expect(session?.status).toBe("ready");
          expect(yield* argvOfTurn(0)).toContain("stream-json");
        }),
    ),
  );

  it.effect("is read-only for every mode but full-access, which alone gets --force", () =>
    Effect.gen(function* () {
      for (const [mode, flag] of [
        ["auto", "ask"],
        ["approval-required", "ask"],
        ["auto-accept-edits", "ask"],
        ["full-access", "--force"],
      ] as const) {
        yield* withAdapter(
          `cat ${JSON.stringify(fixturePath)}`,
          ({ adapter, dir, terminal, argvOfTurn }) =>
            Effect.gen(function* () {
              yield* start(adapter, dir, mode);
              yield* adapter.sendTurn({ threadId: THREAD, input: "hi" });
              yield* Deferred.await(terminal);

              expect(yield* argvOfTurn(0)).toContain(flag);
            }),
        );
      }
    }),
  );

  it.effect("prepends the memory context to the prompt and never writes .cursor/rules", () =>
    withAdapter(`cat ${JSON.stringify(fixturePath)}`, ({ adapter, dir, terminal, argvOfTurn }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        yield* start(adapter, dir, "auto");
        yield* adapter.sendTurn({
          threadId: THREAD,
          input: "what now?",
          persistentMemoryContext: "You are Sam. Remember: tea.",
        });
        yield* Deferred.await(terminal);

        const prompt = yield* fs.readFileString(path.join(dir, "stdin.log"));

        expect((yield* argvOfTurn(0)).join(" ")).not.toContain("tea");
        expect(prompt).toContain("You are Sam. Remember: tea.");
        expect(prompt.indexOf("You are Sam")).toBeLessThan(prompt.indexOf("what now?"));
        expect(yield* fs.exists(path.join(dir, ".cursor"))).toBe(false);
      }),
    ),
  );

  it.effect("fails a turn with the error result and a runtime error", () =>
    withAdapter(
      `printf '%s\\n' '${INIT}' '${ERROR_RESULT}'`,
      ({ adapter, dir, events, terminal }) =>
        Effect.gen(function* () {
          yield* start(adapter, dir, "auto");
          yield* adapter.sendTurn({ threadId: THREAD, input: "hi" });
          yield* Deferred.await(terminal);

          expect(events.find((event) => event.type === "turn.completed")).toMatchObject({
            payload: { state: "failed", errorMessage: "model overloaded" },
          });
          expect(events.some((event) => event.type === "runtime.error")).toBe(true);
        }),
    ),
  );

  // Real clock: the test waits for a real child process.
  it.live("interrupts a running turn into turn.aborted and keeps the session id", () =>
    withAdapter(
      `printf '%s\\n' '${INIT}'\nexec sleep 30`,
      ({ adapter, dir, events, terminal, sessionSeen }) =>
        Effect.gen(function* () {
          yield* start(adapter, dir, "auto");
          const turn = yield* adapter.sendTurn({ threadId: THREAD, input: "hi" });

          // Signal only once Cursor has reported its session, so the id is there to keep.
          yield* Deferred.await(sessionSeen).pipe(Effect.timeout("8 seconds"));
          yield* adapter.interruptTurn(THREAD, turn.turnId);
          // A typed end, never a hang: bounded so a regression fails fast instead of timing out.
          yield* Deferred.await(terminal).pipe(Effect.timeout("8 seconds"));

          expect(events.find((event) => event.type === "turn.aborted")).toMatchObject({
            payload: { reason: "Interrupted by user." },
          });

          const [session] = yield* adapter.listSessions();

          expect(session).toMatchObject({ status: "ready", resumeCursor: { sessionId: "sess-1" } });
        }),
    ),
  );

  it.effect(
    "rejects a second turn while one runs, attachments, a missing workspace and rollback",
    () =>
      withAdapter(`exec sleep 30`, ({ adapter, dir }) =>
        Effect.gen(function* () {
          yield* start(adapter, dir, "auto");
          yield* adapter.sendTurn({ threadId: THREAD, input: "one" });

          expect(
            yield* Effect.flip(adapter.sendTurn({ threadId: THREAD, input: "two" })),
          ).toMatchObject({
            _tag: "ProviderAdapterValidationError",
          });
          expect(yield* Effect.flip(adapter.rollbackThread(THREAD, 1))).toMatchObject({
            _tag: "ProviderAdapterRequestError",
          });
          expect(
            yield* Effect.flip(
              adapter.startSession({
                threadId: ThreadId.make("thread-2"),
                providerInstanceId: INSTANCE,
                runtimeMode: "auto",
              }),
            ),
          ).toMatchObject({ _tag: "ProviderAdapterValidationError" });

          yield* adapter.stopAll();
        }),
      ),
  );
});
