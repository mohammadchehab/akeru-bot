import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeSocket from "@effect/platform-node/NodeSocket";
import { assert, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { TestClock } from "effect/testing";
import { HttpBody, HttpClient } from "effect/unstable/http";

import { buildAppUnderTest } from "./serverTestApp.ts";
import {
  getAuthenticatedSessionCookieHeader,
  getWsServerUrl,
  jsonRequestBody,
} from "./serverTestClients.ts";

/** Opens a raw socket as the given session and resolves with an effect that waits for it to close. */
const openSocket = (cookie: string) =>
  Effect.gen(function* () {
    const url = yield* getWsServerUrl("/ws", { authenticated: false });
    const socket = new NodeSocket.NodeWS.WebSocket(url, { headers: { cookie } });

    // Listen from the start: the close can land before the test gets around to waiting on it.
    const closedSignal = yield* Deferred.make<number>();

    socket.once("close", (code) => Deferred.doneUnsafe(closedSignal, Exit.succeed(code)));

    const closed = Deferred.await(closedSignal);

    yield* Effect.callback<void, Error>((resume) => {
      socket.once("open", () => resume(Effect.void));
      socket.once("error", (error) => resume(Effect.fail(error)));
    });

    return { closed, socket };
  });

const pairSecondClient = (ownerCookie: string) =>
  Effect.gen(function* () {
    const pairingResponse = yield* HttpClient.post("/api/auth/pairing-token", {
      headers: { cookie: ownerCookie },
      body: yield* HttpBody.json({}),
    });
    const pairingBody = (yield* pairingResponse.json) as { readonly credential: string };

    return yield* getAuthenticatedSessionCookieHeader(pairingBody.credential);
  });

it.layer(NodeServices.layer)("websocket session lifetime", (it) => {
  it.effect("closes an open socket when its session is revoked", () =>
    Effect.gen(function* () {
      yield* buildAppUnderTest({ config: { host: "0.0.0.0" } });

      const ownerCookie = yield* getAuthenticatedSessionCookieHeader();
      const pairedCookie = yield* pairSecondClient(ownerCookie);

      const clientsResponse = yield* HttpClient.get("/api/auth/clients", {
        headers: { cookie: ownerCookie },
      });
      const clients = (yield* clientsResponse.json) as ReadonlyArray<{
        readonly sessionId: string;
        readonly current: boolean;
      }>;
      const pairedSessionId = clients.find((entry) => !entry.current)?.sessionId;

      assert.isDefined(pairedSessionId);

      const { closed, socket } = yield* openSocket(pairedCookie);

      assert.equal(socket.readyState, NodeSocket.NodeWS.WebSocket.OPEN);

      const revokeResponse = yield* HttpClient.post("/api/auth/clients/revoke", {
        headers: { cookie: ownerCookie, "content-type": "application/json" },
        body: HttpBody.text(jsonRequestBody({ sessionId: pairedSessionId }), "application/json"),
      });

      assert.equal(revokeResponse.status, 200);

      yield* closed;

      assert.notEqual(socket.readyState, NodeSocket.NodeWS.WebSocket.OPEN);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("closes an open socket when its session reaches expiresAt", () =>
    Effect.gen(function* () {
      yield* buildAppUnderTest();

      const cookie = yield* getAuthenticatedSessionCookieHeader();
      const { closed, socket } = yield* openSocket(cookie);

      assert.equal(socket.readyState, NodeSocket.NodeWS.WebSocket.OPEN);

      yield* TestClock.adjust("31 days");
      yield* closed;

      assert.notEqual(socket.readyState, NodeSocket.NodeWS.WebSocket.OPEN);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );
});
