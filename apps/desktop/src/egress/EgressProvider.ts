import type { EgressOpenFrame, EgressRefusalReason } from "@isnadi/contracts";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";

import { normalizeHost } from "@isnadi/shared/siteDomain";

import { type EgressRefused } from "./EgressDialer.ts";
import { createStreamCounter } from "./EgressLimits.ts";

/** The dialed target, as the provider pumps it. The provider never sees a hostname. */
export interface EgressTarget {
  /** Ends when the target closes or errors. */
  readonly run: (onData: (chunk: Uint8Array) => Effect.Effect<void>) => Effect.Effect<void>;
  readonly write: (chunk: Uint8Array) => Effect.Effect<void>;
  readonly destroy: Effect.Effect<void>;
}

/** The desktop's websocket to `/egress/stream/:streamId`, opened with the frame's ticket. */
export interface EgressStreamLink {
  readonly send: (chunk: Uint8Array) => Effect.Effect<void>;
  /** Ends when the server closes the stream socket. */
  readonly run: (onData: (chunk: Uint8Array) => Effect.Effect<void>) => Effect.Effect<void>;
  readonly close: Effect.Effect<void>;
}

export interface EgressProviderDeps {
  /** `openEgressTarget` with the real resolver, connector, grants, and interface list bound. */
  readonly dial: (request: {
    readonly host: string;
    readonly port: number;
    readonly profileId: string;
  }) => Effect.Effect<EgressTarget, EgressRefused>;
  readonly openStreamLink: (
    streamId: string,
    ticket: string,
  ) => Effect.Effect<EgressStreamLink, Error>;
  readonly sendControl: (
    frame:
      | {
          readonly type: "refused";
          readonly streamId: string;
          readonly reason: EgressRefusalReason;
        }
      | { readonly type: "closed"; readonly streamId: string },
  ) => Effect.Effect<void>;
  /** Waits before moving `bytes`, per the session's token bucket. */
  readonly throttle: (bytes: number) => Effect.Effect<void>;
  /** Whether the owner's grants still cover this host right now. Read after every dial. */
  readonly stillAllowed: (profileId: string, host: string) => boolean;
  /** Grant changes. A change ends every live or pending stream the grants no longer cover. */
  readonly revocations: Stream.Stream<{ readonly profileId: string; readonly host?: string }>;
  readonly maxStreams: number;
  readonly idleTimeoutMs: number;
}

/** A stream the provider has accepted, indexed so a revocation can find it before it connects. */
interface LiveStream {
  readonly profileId: string;
  readonly host: string;
  readonly revoked: Deferred.Deferred<void>;
}

/**
 * Serves `open` frames from the server. The frame's host and port are a request, not a
 * decision: every one goes through the dialer's own checks, and a refusal is reported without
 * any TCP having been opened.
 */
export const makeEgressProvider = (deps: EgressProviderDeps) => {
  const streams = createStreamCounter(deps.maxStreams);

  const running = new Set<Fiber.Fiber<void>>();

  const live = new Set<LiveStream>();

  const serve = (frame: EgressOpenFrame): Effect.Effect<void> => {
    const refuse = (reason: EgressRefusalReason) =>
      deps.sendControl({ type: "refused", streamId: frame.streamId, reason });

    return Effect.gen(function* () {
      if (!streams.tryAcquire()) return yield* refuse("stream-limit");

      // Registered before the dial so a revocation also reaches a stream still resolving or connecting.
      const entry: LiveStream = {
        profileId: frame.profileId,
        host: normalizeHost(frame.host) ?? frame.host,
        revoked: yield* Deferred.make<void>(),
      };

      live.add(entry);

      let linked = false;

      const stream = Effect.gen(function* () {
        const target = yield* deps
          .dial({ host: frame.host, port: frame.port, profileId: frame.profileId })
          .pipe(Effect.result);

        if (Result.isFailure(target)) return yield* refuse(target.failure.reason);

        // The grant may have been revoked while the dial was in flight.
        if (!deps.stillAllowed(frame.profileId, frame.host)) {
          yield* target.success.destroy;

          return yield* refuse("host-not-granted");
        }

        const link = yield* deps.openStreamLink(frame.streamId, frame.ticket).pipe(
          Effect.onInterrupt(() => target.success.destroy),
          Effect.result,
        );

        if (Result.isFailure(link)) {
          yield* target.success.destroy;

          return yield* refuse("connect-failed");
        }

        linked = true;

        // Either side ending, or going quiet for the idle timeout, ends the stream.
        let touched = false;

        const mark = Effect.sync(() => {
          touched = true;
        });

        const toServer = target.success.run((chunk) =>
          mark.pipe(
            Effect.andThen(deps.throttle(chunk.byteLength)),
            Effect.andThen(link.success.send(chunk)),
          ),
        );

        const toTarget = link.success.run((chunk) =>
          mark.pipe(
            Effect.andThen(deps.throttle(chunk.byteLength)),
            Effect.andThen(target.success.write(chunk)),
          ),
        );

        const idle = Effect.gen(function* () {
          while (true) {
            touched = false;
            yield* Effect.sleep(deps.idleTimeoutMs);

            if (!touched) return;
          }
        });

        yield* Effect.raceFirst(Effect.raceFirst(toServer, toTarget), idle).pipe(
          Effect.ensuring(
            Effect.all([target.success.destroy, link.success.close], { discard: true }),
          ),
        );
        yield* deps.sendControl({ type: "closed", streamId: frame.streamId });
      });

      const outcome = yield* Effect.raceFirst(
        stream.pipe(Effect.as("ended" as const)),
        Deferred.await(entry.revoked).pipe(Effect.as("revoked" as const)),
      ).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            live.delete(entry);
            streams.release();
          }),
        ),
      );

      if (outcome === "revoked") {
        yield* linked
          ? deps.sendControl({ type: "closed", streamId: frame.streamId })
          : refuse("host-not-granted");
      }
    });
  };

  /** Forks the stream so one slow dial never blocks the control loop. */
  const handleOpen = (frame: EgressOpenFrame): Effect.Effect<void> =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkDetach(serve(frame));

      running.add(fiber);
      fiber.addObserver(() => {
        running.delete(fiber);
      });
    });

  /** Ends every stream whose grant no longer allows it. Runs for the life of the control socket. */
  const watchRevocations = deps.revocations.pipe(
    Stream.runForEach((revocation) =>
      Effect.forEach(
        [...live].filter(
          (entry) =>
            entry.profileId === revocation.profileId &&
            !deps.stillAllowed(entry.profileId, entry.host),
        ),
        (entry) => Deferred.succeed(entry.revoked, undefined),
        { discard: true },
      ),
    ),
  );

  /** Destroys every live stream. Call when the control socket closes. */
  const shutdown = Effect.suspend(() =>
    Fiber.interruptAll([...running]).pipe(Effect.andThen(Effect.sync(() => running.clear()))),
  );

  return { handleOpen, watchRevocations, shutdown, liveStreams: streams.live };
};
