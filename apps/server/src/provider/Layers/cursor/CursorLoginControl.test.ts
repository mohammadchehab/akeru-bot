import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Ref from "effect/Ref";
import { ProviderInstanceId } from "@isnadi/contracts";

import { makeCursorLoginControl } from "./CursorLoginControl.ts";

const INSTANCE = ProviderInstanceId.make("cursor");

// A shell stand-in for `agent`: the body is a `case` on the subcommand it was called with.
const withControl = <A, E, R>(
  body: string,
  use: (input: {
    readonly control: Effect.Success<ReturnType<typeof makeCursorLoginControl>>;
    readonly refreshed: Ref.Ref<number>;
    readonly refreshSignal: Deferred.Deferred<void>;
    readonly dir: string;
  }) => Effect.Effect<A, E, R>,
  options?: { readonly env?: NodeJS.ProcessEnv; readonly linkWait?: "200 millis" | "8 seconds" },
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "isnadi-cursor-control-" });
      const agent = path.join(dir, "agent");
      yield* fs.writeFileString(agent, `#!/bin/sh\ncase "$1" in\n${body}\nesac\n`);
      yield* fs.chmod(agent, 0o755);

      const refreshed = yield* Ref.make(0);
      const refreshSignal = yield* Deferred.make<void>();

      const control = yield* makeCursorLoginControl({
        resolve: () => Effect.succeed({ binaryPath: agent, env: options?.env ?? {} }),
        linkWait: options?.linkWait ?? "8 seconds",
        refresh: () =>
          Ref.update(refreshed, (count) => count + 1).pipe(
            Effect.andThen(Deferred.succeed(refreshSignal, undefined)),
          ),
        scope: yield* Effect.scope,
      });

      return yield* use({ control, refreshed, refreshSignal, dir });
    }),
  ).pipe(Effect.provide(NodeServices.layer));

// Pids the stand-in `agent` recorded that are still running.
const livePids = (dir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const text = yield* fs.readFileString(`${dir}/pids`).pipe(Effect.orElseSucceed(() => ""));

    return text
      .split("\n")
      .filter(Boolean)
      .map(Number)
      .filter((pid) => {
        try {
          process.kill(pid, 0);

          return true;
        } catch {
          return false;
        }
      });
  });

describe("makeCursorLoginControl", () => {
  it.live("hands back the login link and refreshes the provider once the CLI exits", () =>
    withControl(`login) echo "go https://cursor.com/login" ;;`, ({ control, refreshSignal }) =>
      Effect.gen(function* () {
        const started = yield* control.start(INSTANCE);

        expect(started.loginUrl).toBe("https://cursor.com/login");
        yield* Deferred.await(refreshSignal).pipe(Effect.timeout("8 seconds"));
      }),
    ),
  );

  it.live("reports no link when the CLI prints none", () =>
    withControl(`login) echo "Already logged in" ;;`, ({ control }) =>
      Effect.gen(function* () {
        expect((yield* control.start(INSTANCE)).loginUrl).toBeNull();
      }),
    ),
  );

  it.live("a second login ends the first one", () =>
    withControl(
      `login) echo "go https://cursor.com/login"; exec sleep 30 ;;`,
      ({ control, refreshSignal }) =>
        Effect.gen(function* () {
          yield* control.start(INSTANCE);
          yield* control.start(INSTANCE);

          // Only the first login can have ended so far, and it refreshed on its way out.
          yield* Deferred.await(refreshSignal).pipe(Effect.timeout("8 seconds"));
          yield* control.cancel;
        }),
    ),
  );

  it.live("logout runs the CLI's logout and leaves the refresh to its caller", () =>
    withControl(`logout) exit 0 ;;`, ({ control, refreshed }) =>
      Effect.gen(function* () {
        yield* control.logout(INSTANCE);

        expect(yield* Ref.get(refreshed)).toBe(0);
      }),
    ),
  );

  it.live("a failed logout says why", () =>
    withControl(`logout) echo "not allowed" >&2; exit 3 ;;`, ({ control }) =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(control.logout(INSTANCE));

        expect(Exit.isFailure(exit)).toBe(true);
        expect(JSON.stringify(exit)).toContain("not allowed");
      }),
    ),
  );

  it.live("runs the CLI with the environment resolved for the instance", () =>
    withControl(
      `login) echo "go https://cursor.com/login?mark=$E2E_MARK" ;;`,
      ({ control }) =>
        Effect.gen(function* () {
          expect((yield* control.start(INSTANCE)).loginUrl).toBe(
            "https://cursor.com/login?mark=seen",
          );
        }),
      { env: { E2E_MARK: "seen" } },
    ),
  );

  it.live("two concurrent logins leave exactly one live process", () =>
    withControl(
      `login) echo $$ >> "$(dirname "$0")/pids"; echo "go https://cursor.com/login"; exec sleep 30 ;;`,
      ({ control, dir }) =>
        Effect.gen(function* () {
          yield* Effect.all([control.start(INSTANCE), control.start(INSTANCE)], {
            concurrency: 2,
          });

          expect(yield* livePids(dir)).toHaveLength(1);
          yield* control.cancel;
          expect(yield* livePids(dir)).toHaveLength(0);
        }),
    ),
  );

  it.live("a login that prints no link does not linger", () =>
    withControl(
      `login) echo $$ >> "$(dirname "$0")/pids"; exec sleep 30 ;;`,
      ({ control, dir }) =>
        Effect.gen(function* () {
          expect((yield* control.start(INSTANCE)).loginUrl).toBeNull();
          expect(yield* livePids(dir)).toHaveLength(0);
        }),
      { linkWait: "200 millis" },
    ),
  );

  it.live("a finished login does not stop the one that replaced it", () =>
    withControl(
      `login) echo $$ >> "$(dirname "$0")/pids"; echo "go https://cursor.com/login"; exec sleep 30 ;;`,
      ({ control, dir, refreshSignal }) =>
        Effect.gen(function* () {
          yield* control.start(INSTANCE);
          yield* control.start(INSTANCE);
          // The first login's exit has been handled once it refreshed.
          yield* Deferred.await(refreshSignal).pipe(Effect.timeout("8 seconds"));
          expect(yield* livePids(dir)).toHaveLength(1);

          yield* control.cancel;
          expect(yield* livePids(dir)).toHaveLength(0);
        }),
    ),
  );
});
