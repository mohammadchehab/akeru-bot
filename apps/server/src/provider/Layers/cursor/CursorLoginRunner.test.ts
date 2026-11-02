import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { startCursorLogin } from "./CursorLoginRunner.ts";

// A shell stand-in for `agent`: the body is the script run for `login`.
const withLogin = <A, E, R>(
  body: string,
  use: (login: Effect.Success<ReturnType<typeof startCursorLogin>>) => Effect.Effect<A, E, R>,
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "isnadi-cursor-login-" });
      const agent = path.join(dir, "agent");
      yield* fs.writeFileString(agent, `#!/bin/sh\n${body}\n`);
      yield* fs.chmod(agent, 0o755);

      const login = yield* startCursorLogin({ command: agent, args: ["login"], env: {} });

      return yield* use(login);
    }),
  ).pipe(Effect.provide(NodeServices.layer));

describe("startCursorLogin", () => {
  it.live("returns the printed link and asks the CLI not to open a browser", () =>
    withLogin(`echo "Open this link: https://cursor.com/login?open=$NO_OPEN_BROWSER"`, (login) =>
      Effect.gen(function* () {
        expect(yield* login.loginUrl).toBe("https://cursor.com/login?open=1");
        expect(yield* login.exit).toBe(0);
      }),
    ),
  );

  it.live("reports no link when the CLI exits without printing one", () =>
    withLogin(`echo "already logged in"`, (login) =>
      Effect.gen(function* () {
        expect(yield* login.loginUrl).toBeUndefined();
        expect(yield* login.exit).toBe(0);
      }),
    ),
  );

  it.live("cancel ends a login that is still waiting for the browser", () =>
    withLogin(`echo "go https://cursor.com/login"\nexec sleep 30`, (login) =>
      Effect.gen(function* () {
        expect(yield* login.loginUrl).toBe("https://cursor.com/login");
        yield* login.cancel;
        expect(yield* login.exit).not.toBe(0);
      }),
    ),
  );
});
