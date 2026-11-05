import {
  AuthEgressProvideScope,
  EgressDesktopFrame,
  type EgressOpenFrame,
} from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerRespondable,
  HttpServerResponse,
} from "effect/unstable/http";
import * as Socket from "effect/unstable/socket/Socket";
import * as EnvironmentAuth from "../auth/EnvironmentAuth.ts";
import { failEnvironmentAuthInvalid, failEnvironmentInternal } from "../auth/http.ts";
import * as EgressBroker from "./EgressBroker.ts";

const decodeDesktopFrame = Schema.decodeUnknownOption(Schema.fromJsonString(EgressDesktopFrame));

/** Authenticates the upgrade and requires the user-only `egress:provide` scope. */
const authenticateEgress = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;

  const session = yield* serverAuth.authenticateWebSocketUpgrade(request).pipe(
    Effect.catchIf(EnvironmentAuth.isServerAuthCredentialError, (error) =>
      failEnvironmentAuthInvalid(EnvironmentAuth.serverAuthCredentialReason(error)),
    ),
    Effect.catchIf(EnvironmentAuth.isServerAuthInternalError, (error) =>
      failEnvironmentInternal("internal_error", error),
    ),
  );

  return { request, session, allowed: session.scopes.includes(AuthEgressProvideScope) };
});

const respondErrors = Effect.catchTags({
  EnvironmentAuthInvalidError: HttpServerRespondable.toResponse,
  EnvironmentInternalError: HttpServerRespondable.toResponse,
});

const controlRoute = (broker: EgressBroker.EgressBroker["Service"]) =>
  HttpRouter.add(
  "GET",
  "/egress",
  Effect.gen(function* () {
    const { request, session, allowed } = yield* authenticateEgress;

    if (!allowed) return HttpServerResponse.empty({ status: 403 });
    const socket = yield* request.upgrade;
    const write = yield* socket.writer;

    return yield* Effect.scoped(
      Effect.gen(function* () {
        const provider = yield* broker.registerProvider(session.subject, (frame: EgressOpenFrame) =>
          write(JSON.stringify(frame)).pipe(Effect.ignore),
        );

        yield* socket.runString((text) =>
          Option.match(decodeDesktopFrame(text), {
            onNone: () => Effect.void,
            onSome: provider.onFrame,
          }),
        );

        return HttpServerResponse.empty();
      }),
    ).pipe(Effect.catch(() => Effect.succeed(HttpServerResponse.empty())));
  }).pipe(respondErrors),
);

const streamRoute = (broker: EgressBroker.EgressBroker["Service"]) =>
  HttpRouter.add(
  "GET",
  "/egress/stream/:streamId",
  Effect.gen(function* () {
    const { request, session, allowed } = yield* authenticateEgress;

    if (!allowed) return HttpServerResponse.empty({ status: 403 });
    const params = yield* HttpRouter.params;
    const streamId = params.streamId ?? "";
    const ticket = new URL(request.url, "http://localhost").searchParams.get("ticket") ?? "";
    const socket = yield* request.upgrade;
    const write = yield* socket.writer;

    const handlers = yield* broker
      .attach(session.subject, streamId, ticket, {
        send: (chunk) => write(chunk).pipe(Effect.ignore),
        close: write(new Socket.CloseEvent(1000)).pipe(Effect.ignore),
      })
      .pipe(Effect.option);

    if (Option.isNone(handlers)) return HttpServerResponse.empty({ status: 403 });
    yield* socket.run(handlers.value.onData).pipe(
      Effect.ignore,
      Effect.ensuring(handlers.value.onEnd),
    );

    return HttpServerResponse.empty();
  }).pipe(respondErrors),
);

/** Needs `EgressBroker`; the server provides one shared instance so the proxy and the routes agree. */
export const egressRouteLayer = Layer.unwrap(
  Effect.gen(function* () {
    const broker = yield* EgressBroker.EgressBroker;

    return Layer.mergeAll(controlRoute(broker), streamRoute(broker));
  }),
);
