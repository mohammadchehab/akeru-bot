import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import { startCursorTurn, type CursorTurnResult } from "./CursorTurnRunner.ts";
import type { CursorTurnEvent } from "./CursorStreamEvents.ts";

const fixturePath = new URL("./fixtures/turn-read-file.ndjson", import.meta.url).pathname;

const INIT = JSON.stringify({ type: "system", subtype: "init", session_id: "sess-1" });

const TOOL_STARTED = JSON.stringify({
  type: "tool_call",
  subtype: "started",
  call_id: "call-1",
  tool_call: { readToolCall: { args: { path: "a" } } },
});

// A shell stand-in for `agent`: the body is the script run for a turn. `exec` keeps the tracked
// PID the process that gets the signal.
const run = (body: string, interruptOn?: CursorTurnEvent["type"]) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "isnadi-cursor-turn-" });
      const agent = path.join(dir, "agent");
      yield* fs.writeFileString(agent, `#!/bin/sh\ncat > /dev/null\n${body}\n`);
      yield* fs.chmod(agent, 0o755);

      const turn = yield* startCursorTurn({
        command: agent,
        args: ["-p"],
        cwd: dir,
        env: {},
        prompt: "the prompt text",
      });

      const events: CursorTurnEvent[] = [];
      yield* turn.events.pipe(
        Stream.runForEach((event) =>
          Effect.gen(function* () {
            events.push(event);

            // Interrupt only once the process has shown it is running, so the signal is not racing
            // its start-up.
            if (event.type === interruptOn) yield* Effect.forkScoped(turn.interrupt);
          }),
        ),
      );
      const result = yield* turn.result;

      return { events, result };
    }),
  ).pipe(Effect.provide(NodeServices.layer));

describe("startCursorTurn", () => {
  it.effect("sends the prompt on stdin, whatever its size", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "isnadi-cursor-stdin-" });
      const received = path.join(dir, "stdin.txt");
      const agent = path.join(dir, "agent");
      const big = "x".repeat(300_000);

      yield* fs.writeFileString(agent, `#!/bin/sh\ncat > ${JSON.stringify(received)}\n`);
      yield* fs.chmod(agent, 0o755);

      const turn = yield* startCursorTurn({
        command: agent,
        args: [],
        cwd: dir,
        env: {},
        prompt: big,
      });

      yield* Stream.runDrain(turn.events);
      yield* turn.result;

      expect(yield* fs.readFileString(received)).toBe(big);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("streams a recorded turn and completes", () =>
    Effect.gen(function* () {
      const { events, result } = yield* run(`cat ${JSON.stringify(fixturePath)}`);

      expect(events.some((event) => event.type === "text.delta")).toBe(true);
      expect(result).toMatchObject<Partial<CursorTurnResult>>({
        outcome: "completed",
        sessionId: "00000000-0000-4000-8000-000000000001",
        exitCode: 0,
      });
      expect(result.usage).toMatchObject({ inputTokens: 13443, outputTokens: 338 });
    }),
  );

  it.effect("fails with stderr as the message on a non-zero exit", () =>
    Effect.gen(function* () {
      const { result } = yield* run(
        "echo \"Error: Authentication required. Please run 'agent login' first.\" >&2; exit 1",
      );

      expect(result.outcome).toBe("failed");
      expect(result.message).toContain("agent login");
      expect(result.exitCode).toBe(1);
    }),
  );

  it.effect("keeps only the tail of a very long stderr", () =>
    Effect.gen(function* () {
      const { result } = yield* run(
        "head -c 200000 /dev/zero | tr '\\0' 'e' >&2; echo THE-END >&2; exit 1",
      );

      expect(result.outcome).toBe("failed");
      expect(result.message?.endsWith("THE-END")).toBe(true);
      expect(result.message?.length).toBeLessThanOrEqual(8192);
    }),
  );

  it.effect("fails on an error result even when the process exits 0", () =>
    Effect.gen(function* () {
      const line = JSON.stringify({ type: "result", is_error: true, result: "model overloaded" });
      const { result } = yield* run(`printf '%s\\n' '${line}'`);

      expect(result).toMatchObject({ outcome: "failed", message: "model overloaded" });
    }),
  );

  it.effect(
    "treats our own interrupt with no result as an interrupted turn that keeps the session",
    () =>
      Effect.gen(function* () {
        const { events, result } = yield* run(
          `printf '%s\\n' '${INIT}' '${TOOL_STARTED}'\nexec sleep 30`,
          "tool.started",
        );

        expect(result).toMatchObject({ outcome: "interrupted", sessionId: "sess-1" });
        // The tool Cursor never finished is closed so no spinner is left running.
        expect(events).toContainEqual({
          type: "tool.completed",
          callId: "call-1",
          kind: "read",
          result: undefined,
          aborted: true,
        });
      }),
  );

  it.effect("fails, not interrupts, when the process dies by itself without a result", () =>
    Effect.gen(function* () {
      const { result } = yield* run(`printf '%s\\n' '${INIT}'\nexit 3`);

      expect(result).toMatchObject({ outcome: "failed", sessionId: "sess-1", exitCode: 3 });
    }),
  );
});
