/**
 * Runs `agent login` as a tracked child process. The CLI is started with `NO_OPEN_BROWSER=1`, so
 * it prints a link instead of opening a browser; a client on another machine shows that link and
 * the user finishes signing in there. The process stays alive until the user is done or `cancel`.
 *
 * @module provider/Layers/cursor/CursorLoginRunner
 */
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { parseCursorLoginUrl } from "./CursorLogin.ts";

/** How long a SIGINT gets before the login process is killed outright. */
const CANCEL_GRACE = "2 seconds";

export interface CursorLoginStartInput {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly env: NodeJS.ProcessEnv;
  /** From `resolveSpawnCommand`: true for a Windows `.cmd` shim, which must run through a shell. */
  readonly shell?: boolean | undefined;
}

/** Must run in a scope that outlives the request: closing it kills the login process. */
export const startCursorLogin = Effect.fn("startCursorLogin")(function* (
  input: CursorLoginStartInput,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

  const child = yield* spawner.spawn(
    ChildProcess.make(input.command, [...input.args], {
      env: { ...input.env, NO_OPEN_BROWSER: "1" },
      extendEnv: true,
      ...(input.shell !== undefined ? { shell: input.shell } : {}),
    }),
  );

  const link = yield* Deferred.make<string | undefined>();
  const output = yield* Ref.make("");

  const read = (stream: typeof child.stdout) =>
    stream.pipe(
      Stream.decodeText(),
      Stream.runForEach((chunk) =>
        Ref.updateAndGet(output, (text) => `${text}${chunk}`).pipe(
          Effect.flatMap((text) => {
            const url = parseCursorLoginUrl(text);

            return url === undefined ? Effect.void : Deferred.succeed(link, url);
          }),
        ),
      ),
      Effect.ignore,
    );

  const exit = child.exitCode.pipe(
    Effect.map(Number),
    Effect.orElseSucceed(() => -1),
  );

  // Both streams end when the process does; a login that never printed a link settles as none.
  yield* Effect.all([read(child.stdout), read(child.stderr)], { concurrency: "unbounded" }).pipe(
    Effect.andThen(Deferred.succeed(link, undefined)),
    Effect.forkScoped,
  );

  return {
    pid: child.pid,
    loginUrl: Deferred.await(link),
    exit,
    cancel: child.kill({ killSignal: "SIGINT", forceKillAfter: CANCEL_GRACE }).pipe(Effect.ignore),
  };
});
