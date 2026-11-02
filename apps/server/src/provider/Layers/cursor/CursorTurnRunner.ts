/**
 * Runs one headless Cursor turn as a tracked child process. `events` must be drained: the
 * turn's `result` settles when the stream ends, once the exit code is known and any tool Cursor
 * left open has been closed.
 *
 * @module provider/Layers/cursor/CursorTurnRunner
 */
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import {
  createCursorStreamReducer,
  type CursorTurnEvent,
  type CursorUsage,
} from "./CursorStreamEvents.ts";

/** How long a SIGINT gets before the process is killed outright. */
const INTERRUPT_GRACE = "2 seconds";

/** A failed turn reports the end of stderr; a long turn must not grow it without limit. */
const STDERR_TAIL_CHARS = 8192;

export interface CursorTurnStartInput {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  /** From `resolveSpawnCommand`: true for a Windows `.cmd` shim, which must run through a shell. */
  readonly shell?: boolean | undefined;
  /** Written to the child's stdin, which is then closed: `agent -p` reads its prompt from there. */
  readonly prompt: string;
}

export interface CursorTurnResult {
  readonly outcome: "completed" | "failed" | "interrupted";
  readonly exitCode: number;
  /** Kept after an interrupt so the next turn can `--resume` it. */
  readonly sessionId?: string;
  readonly usage?: CursorUsage;
  /** Why a failed turn failed: Cursor's error result, else stderr. */
  readonly message?: string;
}

export const startCursorTurn = Effect.fn("startCursorTurn")(function* (
  input: CursorTurnStartInput,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

  const child = yield* spawner.spawn(
    ChildProcess.make(input.command, [...input.args], {
      cwd: input.cwd,
      env: input.env,
      extendEnv: true,
      ...(input.shell !== undefined ? { shell: input.shell } : {}),
      stdin: Stream.make(new TextEncoder().encode(input.prompt)),
    }),
  );

  const reducer = createCursorStreamReducer();
  const interrupted = yield* Ref.make(false);
  const stderr = yield* Ref.make("");
  const settled = yield* Deferred.make<CursorTurnResult>();

  let sessionId: string | undefined;
  let usage: CursorUsage | undefined;
  let errorResult: string | undefined;

  const observe = (event: CursorTurnEvent) => {
    if (event.type === "session") sessionId = event.sessionId;

    if (event.type === "result") {
      usage = event.usage;

      if (event.isError) errorResult = event.text;
    }

    return event;
  };

  yield* child.stderr.pipe(
    Stream.decodeText(),
    Stream.runForEach((chunk) =>
      Ref.update(stderr, (text) => `${text}${chunk}`.slice(-STDERR_TAIL_CHARS)),
    ),
    Effect.ignore,
    Effect.forkScoped,
  );

  const finalize = Effect.gen(function* () {
    const exitCode = Number(yield* child.exitCode.pipe(Effect.orElseSucceed(() => -1)));
    const stderrText = (yield* Ref.get(stderr)).trim();
    const ownSignal = yield* Ref.get(interrupted);
    const closing = reducer.finish();

    // Our own signal with no result is an interruption, not a failure: the session is still good.
    const outcome: CursorTurnResult["outcome"] =
      ownSignal && !reducer.sawResult()
        ? "interrupted"
        : exitCode === 0 && errorResult === undefined
          ? "completed"
          : "failed";

    const message = errorResult ?? (stderrText.length > 0 ? stderrText : undefined);

    yield* Deferred.succeed(settled, {
      outcome,
      exitCode,
      ...(sessionId !== undefined ? { sessionId } : {}),
      ...(usage !== undefined ? { usage } : {}),
      ...(outcome === "failed" && message !== undefined ? { message } : {}),
    });

    return closing;
  });

  const events = child.stdout.pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.flatMap((line) => Stream.fromIterable(reducer.push(line).map(observe))),
    Stream.concat(Stream.unwrap(Effect.map(finalize, (closing) => Stream.fromIterable(closing)))),
  );

  return {
    pid: child.pid,
    events,
    result: Deferred.await(settled),
    interrupt: Ref.set(interrupted, true).pipe(
      Effect.andThen(child.kill({ killSignal: "SIGINT", forceKillAfter: INTERRUPT_GRACE })),
      Effect.ignore,
    ),
  };
});
