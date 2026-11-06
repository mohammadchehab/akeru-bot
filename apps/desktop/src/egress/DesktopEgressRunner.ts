import { bootstrapRemoteBearerSession } from "@isnadi/client-runtime/authorization";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as HttpClient from "effect/unstable/http/HttpClient";

import * as DesktopBackendPool from "../backend/DesktopBackendPool.ts";
import { runDesktopEgress } from "./DesktopEgress.ts";

export class DesktopEgressNotConfiguredError extends Schema.TaggedErrorClass<DesktopEgressNotConfiguredError>()(
  "DesktopEgressNotConfiguredError",
  {},
) {
  override get message(): string {
    return "The local backend has no egress provider credential yet.";
  }
}

/**
 * Starts the desktop's egress provider against the primary backend, for the life of the app. The
 * session is minted from the separate egress credential with `[egress:provide]` only, never from
 * the desktop's own bootstrap token.
 */
export const forkDesktopEgress = Effect.gen(function* () {
  const pool = yield* DesktopBackendPool.DesktopBackendPool;
  const primary = yield* pool.primary;
  const httpClient = yield* HttpClient.HttpClient;

  const getSession = Effect.gen(function* () {
    const config = yield* primary.currentConfig;

    const credential = Option.isSome(config)
      ? config.value.bootstrap.egressProviderToken
      : undefined;

    if (Option.isNone(config) || !credential) return yield* new DesktopEgressNotConfiguredError();

    const session = yield* bootstrapRemoteBearerSession({
      httpBaseUrl: config.value.httpBaseUrl.href,
      credential,
      scopes: ["egress:provide"],
      clientMetadata: { label: "IsnadiBot Desktop egress", deviceType: "desktop" },
    }).pipe(Effect.provideService(HttpClient.HttpClient, httpClient));

    return { httpBaseUrl: config.value.httpBaseUrl.href, bearerToken: session.access_token };
  });

  yield* Effect.forkScoped(runDesktopEgress(getSession));
});
