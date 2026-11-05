import * as NodeDns from "node:dns";
import * as NodeNet from "node:net";
import * as NodeOS from "node:os";

import { EgressOpenFrame } from "@isnadi/contracts";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";

import { denyAllHostPolicy, openEgressTarget } from "./EgressDialer.ts";
import * as EgressLimits from "./EgressLimits.ts";
import * as EgressProvider from "./EgressProvider.ts";
import { EgressLinkError, openEgressSocket, type EgressSocketLink } from "./EgressWebSocket.ts";

const decodeOpenFrame = Schema.decodeUnknownOption(Schema.fromJsonString(EgressOpenFrame));

const RECONNECT_DELAYS = [Duration.seconds(1), Duration.seconds(5), Duration.seconds(30)] as const;

const toWsUrl = (httpBaseUrl: string, path: string): string => {
  const url = new URL(path, httpBaseUrl);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return url.href;
};

const lookupAll = (host: string) =>
  Effect.tryPromise({
    try: () => NodeDns.promises.lookup(host, { all: true, verbatim: true }),
    catch: (cause) => new EgressLinkError({ cause }),
  }).pipe(Effect.map((records) => records.map((record) => record.address)));

const connectTcp = (target: { readonly host: string; readonly port: number }) =>
  Effect.callback<NodeNet.Socket, EgressLinkError>((resume) => {
    const socket = NodeNet.connect({ host: target.host, port: target.port });

    socket.once("connect", () => resume(Effect.succeed(socket)));
    socket.once("error", (cause) => resume(Effect.fail(new EgressLinkError({ cause }))));

    return Effect.sync(() => socket.destroy());
  });

const interfaceCidrs = (): ReadonlyArray<string> =>
  Object.values(NodeOS.networkInterfaces()).flatMap((entries) =>
    (entries ?? []).flatMap((entry) => (entry.cidr ? [entry.cidr] : [])),
  );

/** Wraps a dialed socket so the provider can pump it. Reads are queued to stay in order. */
const toEgressTarget = (socket: NodeNet.Socket): Effect.Effect<EgressProvider.EgressTarget> =>
  Effect.gen(function* () {
    const inbound = yield* Queue.unbounded<Uint8Array, Cause.Done>();

    socket.on("data", (chunk) => {
      Queue.offerUnsafe(inbound, chunk);
    });
    socket.once("close", () => {
      Queue.endUnsafe(inbound);
    });
    socket.on("error", () => socket.destroy());

    return {
      run: (onData) =>
        Effect.forever(Queue.take(inbound).pipe(Effect.flatMap(onData))).pipe(
          Effect.catchIf(Cause.isDone, () => Effect.void),
        ),
      write: (chunk) =>
        Effect.callback<void>((resume) => {
          socket.write(chunk, () => resume(Effect.void));
        }),
      destroy: Effect.sync(() => {
        socket.destroy();
      }),
    };
  });

/**
 * One control-socket lifetime: serves `open` frames until the socket closes, then destroys every
 * stream it started.
 */
export const serveEgressControl = (input: {
  readonly control: EgressSocketLink;
  readonly openStream: EgressProvider.EgressProviderDeps["openStreamLink"];
}) =>
  Effect.gen(function* () {
    const bucket = EgressLimits.makeTokenBucket(
      EgressLimits.BYTES_PER_SECOND,
      yield* Clock.currentTimeMillis,
    );

    const provider = EgressProvider.makeEgressProvider({
      dial: (request) =>
        openEgressTarget(request, {
          resolve: lookupAll,
          connect: connectTcp,
          // No per-profile grant store exists yet, so every host is refused until one does.
          hostPolicy: denyAllHostPolicy,
          interfaces: interfaceCidrs,
        }).pipe(Effect.flatMap((socket) => toEgressTarget(socket))),
      openStreamLink: (streamId, ticket) => input.openStream(streamId, ticket),
      sendControl: (frame) => input.control.send(JSON.stringify(frame)),
      throttle: (bytes) =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) => {
            const waitMs = bucket.take(bytes, now);

            return waitMs > 0 ? Effect.sleep(waitMs) : Effect.void;
          }),
        ),
      maxStreams: EgressLimits.MAX_STREAMS_PER_SESSION,
      idleTimeoutMs: EgressLimits.STREAM_IDLE_TIMEOUT_MS,
    });

    yield* input.control
      .run((data, isText) => {
        if (!isText) return Effect.void;

        const frame = decodeOpenFrame(Buffer.from(data).toString("utf8"));

        return Option.isSome(frame) ? provider.handleOpen(frame.value) : Effect.void;
      })
      .pipe(Effect.ensuring(provider.shutdown));
  });

const openStreamLink = (
  httpBaseUrl: string,
  bearerToken: string,
  streamId: string,
  ticket: string,
) =>
  openEgressSocket(
    toWsUrl(
      httpBaseUrl,
      `/egress/stream/${encodeURIComponent(streamId)}?ticket=${encodeURIComponent(ticket)}`,
    ),
    { authorization: `Bearer ${bearerToken}` },
  ).pipe(
    Effect.map((socket) => ({
      send: (chunk: Uint8Array) => socket.send(chunk),
      run: (onData: (chunk: Uint8Array) => Effect.Effect<void>) =>
        socket.run((data, isText) => (isText ? Effect.void : onData(data))),
      close: socket.close,
    })),
  );

/**
 * Keeps the desktop connected as the egress provider for the lifetime of the app. `getSession`
 * returns the backend's address and a bearer token with `[egress:provide]` only; it runs again
 * after every disconnect so a restarted backend is picked up.
 */
export const runDesktopEgress = <E>(
  getSession: Effect.Effect<{ readonly httpBaseUrl: string; readonly bearerToken: string }, E>,
) => {
  const attempt = Effect.gen(function* () {
    const session = yield* getSession;

    const control = yield* openEgressSocket(toWsUrl(session.httpBaseUrl, "/egress"), {
      authorization: `Bearer ${session.bearerToken}`,
    });

    yield* serveEgressControl({
      control,
      openStream: (streamId, ticket) =>
        openStreamLink(session.httpBaseUrl, session.bearerToken, streamId, ticket),
    }).pipe(Effect.ensuring(control.close));
  });

  return Effect.gen(function* () {
    let failures = 0;

    while (true) {
      const started = yield* Clock.currentTimeMillis;
      const exit = yield* attempt.pipe(Effect.exit);

      // A connection that held for a while resets the backoff.
      failures = (yield* Clock.currentTimeMillis) - started > 60_000 ? 0 : failures + 1;
      yield* Effect.logDebug("egress control ended", { failed: Exit.isFailure(exit) });

      yield* Effect.sleep(
        RECONNECT_DELAYS[Math.min(Math.max(failures, 1), RECONNECT_DELAYS.length) - 1] ??
          RECONNECT_DELAYS[0],
      );
    }
  });
};
