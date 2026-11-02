import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ProviderInstanceId, WS_METHODS } from "@isnadi/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";

import { buildAppUnderTest } from "./serverTestApp.ts";
import { getWsServerUrl, withWsRpcClient } from "./serverTestClients.ts";

const instanceId = ProviderInstanceId.make("cursor");

it.layer(NodeServices.layer)("Cursor sign-in over RPC", (it) => {
  it.effect("hands the client the login link for the requested instance", () =>
    Effect.gen(function* () {
      const asked = yield* Ref.make<ProviderInstanceId | null>(null);

      yield* buildAppUnderTest({
        layers: {
          cursorLogin: {
            start: (id) =>
              Ref.set(asked, id).pipe(
                Effect.as({ loginUrl: "https://cursor.com/loginDeepControl?uuid=u-1" }),
              ),
          },
        },
      });

      const result = yield* Effect.scoped(
        withWsRpcClient(yield* getWsServerUrl("/ws"), (client) =>
          client[WS_METHODS.serverCursorLogin]({ instanceId }),
        ),
      );

      assert.equal(result.loginUrl, "https://cursor.com/loginDeepControl?uuid=u-1");
      assert.equal(yield* Ref.get(asked), instanceId);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("signs out and returns the refreshed providers", () =>
    Effect.gen(function* () {
      const loggedOut = yield* Ref.make(0);

      yield* buildAppUnderTest({
        layers: {
          cursorLogin: { logout: () => Ref.update(loggedOut, (count) => count + 1) },
        },
      });

      const result = yield* Effect.scoped(
        withWsRpcClient(yield* getWsServerUrl("/ws"), (client) =>
          client[WS_METHODS.serverCursorLogout]({ instanceId }),
        ),
      );

      assert.deepEqual(result.providers, []);
      assert.equal(yield* Ref.get(loggedOut), 1);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );
});
