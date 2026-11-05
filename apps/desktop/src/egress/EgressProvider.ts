import type { EgressOpenFrame, EgressRefusalReason } from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";

import type { EgressRefused } from "./EgressDialer.ts";
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
      | { readonly type: "refused"; readonly streamId: string; readonly reason: EgressRefusalReason }
      | { readonly type: "closed"; readonly streamId: string },
  ) => Effect.Effect<void>;
  /** Waits before moving `bytes`, per the session's token bucket. */
  readonly throttle: (bytes: number) => Effect.Effect<void>;
  readonly maxStreams: number;
  readonly idleTimeoutMs: number;
}

/**
 * Serves `open` frames from the server. The frame's host and port are a request, not a
 * decision: every one goes through the dialer's own checks, and a refusal is reported without
 * any TCP having been opened.
 */
export const makeEgressProvider = (deps: EgressProviderDeps) => {
  const streams = createStreamCounter(deps.maxStreams);

  const handleOpen = (frame: EgressOpenFrame): Effect.Effect<void> => {
    const refuse = (reason: EgressRefusalReason) =>
      deps.sendControl({ type: "refused", streamId: frame.streamId, reason });

    return Effect.gen(function* () {
      if (!streams.tryAcquire()) return yield* refuse("stream-limit");
      yield* Effect.gen(function* () {
        const target = yield* deps
          .dial({ host: frame.host, port: frame.port, profileId: frame.profileId })
          .pipe(Effect.result);

        if (Result.isFailure(target)) return yield* refuse(target.failure.reason);

        const link = yield* deps
          .openStreamLink(frame.streamId, frame.ticket)
          .pipe(Effect.result);

        if (Result.isFailure(link)) {
          yield* target.success.destroy;

          return yield* refuse("connect-failed");
        }

        // Either side ending, or going quiet for the idle timeout, ends the stream.
        let touched = false;

        const mark = Effect.sync(() => {
          touched = true;
        });

        const toServer = target.success.run((chunk) =>
          mark.pipe(Effect.andThen(deps.throttle(chunk.byteLength)), Effect.andThen(link.success.send(chunk))),
        );

        const toTarget = link.success.run((chunk) =>
          mark.pipe(Effect.andThen(deps.throttle(chunk.byteLength)), Effect.andThen(target.success.write(chunk))),
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
      }).pipe(Effect.ensuring(Effect.sync(streams.release)));
    });
  };

  return { handleOpen, liveStreams: streams.live };
};
