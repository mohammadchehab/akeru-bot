import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { buildAppUnderTest } from "./serverTestApp.ts";
import {
  exchangeAccessToken,
  fetchEffect,
  getHttpServerUrl,
  getAuthenticatedBearerSessionToken,
} from "./serverTestClients.ts";
import { defaultDesktopBootstrapToken, defaultEgressProviderToken } from "./serverTestFixtures.ts";

const egressScope = "egress:provide";

const getEgress = (path: string, bearer: string) =>
  Effect.gen(function* () {
    const url = yield* getHttpServerUrl(path);

    return yield* fetchEffect(url, { headers: { authorization: `Bearer ${bearer}` } });
  });

const providerBearer = Effect.gen(function* () {
  const { response, body } = yield* exchangeAccessToken(defaultEgressProviderToken, {
    scope: egressScope,
  });

  assert.equal(response.status, 200);
  assert.equal(body.scope, egressScope);

  return body.access_token ?? "";
});

it.layer(NodeServices.layer)("egress provider credential", (it) => {
  it.effect("a bootstrap exchange never yields egress:provide, asked for or not", () =>
    Effect.gen(function* () {
      yield* buildAppUnderTest();

      const asked = yield* exchangeAccessToken(defaultDesktopBootstrapToken, { scope: egressScope });
      const plain = yield* exchangeAccessToken(defaultDesktopBootstrapToken);

      assert.notInclude(asked.body.scope ?? "", egressScope);
      assert.notInclude(plain.body.scope ?? "", egressScope);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("the egress credential exchanges for egress:provide alone", () =>
    Effect.gen(function* () {
      yield* buildAppUnderTest();
      yield* providerBearer;
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("the egress routes refuse an admin bearer and a bearer without the scope", () =>
    Effect.gen(function* () {
      yield* buildAppUnderTest();

      const admin = yield* getAuthenticatedBearerSessionToken();

      const { body } = yield* exchangeAccessToken(defaultDesktopBootstrapToken, {
        scope: "orchestration:read",
      });

      for (const bearer of [admin, body.access_token ?? ""]) {
        assert.equal((yield* getEgress("/egress", bearer)).status, 403);
        assert.equal((yield* getEgress("/egress/stream/s1?ticket=t", bearer)).status, 403);
      }
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("a provider bearer is refused a stream with a ticket nothing issued", () =>
    Effect.gen(function* () {
      yield* buildAppUnderTest();

      const bearer = yield* providerBearer;

      assert.equal((yield* getEgress("/egress/stream/s1?ticket=bad", bearer)).status, 403);
      assert.equal((yield* getEgress("/egress/stream/s1", bearer)).status, 403);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );
});
