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
  }) => Effect.Effect<A, E, R>,
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
        binaryPath: Effect.succeed(agent),
        env: {},
        refresh: () =>
          Ref.update(refreshed, (count) => count + 1).pipe(
            Effect.andThen(Deferred.succeed(refreshSignal, undefined)),
          ),
        scope: yield* Effect.scope,
      });

      return yield* use({ control, refreshed, refreshSignal });
    }),
  ).pipe(Effect.provide(NodeServices.layer));

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

  it.live("logout runs the CLI's logout and refreshes", () =>
    withControl(`logout) exit 0 ;;`, ({ control, refreshed }) =>
      Effect.gen(function* () {
        yield* control.logout(INSTANCE);

        expect(yield* Ref.get(refreshed)).toBe(1);
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
});
