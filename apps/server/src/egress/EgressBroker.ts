import * as NodeCrypto from "node:crypto";

import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import type { EgressOpenFrame, EgressRefusalReason } from "@isnadi/contracts";

/** Single-use tickets expire this long after the `open` frame is sent. */
export const EGRESS_TICKET_TTL_MS = 10_000;

export class ProviderGone extends Schema.TaggedErrorClass<ProviderGone>()("ProviderGone", {}) {}

export class EgressStreamRefused extends Schema.TaggedErrorClass<EgressStreamRefused>()(
  "EgressStreamRefused",
  { reason: Schema.String },
) {}

export class EgressTicketInvalid extends Schema.TaggedErrorClass<EgressTicketInvalid>()(
  "EgressTicketInvalid",
  {},
) {}

/** Both directions of one tunnelled TCP stream, as seen by the server's consumer. */
export interface EgressStream {
  readonly streamId: string;
  /** Bytes from the target, ending when the stream closes. */
  readonly inbound: Queue.Dequeue<Uint8Array, Queue.Done>;
  /** Bytes to the target. */
  readonly write: (chunk: Uint8Array) => Effect.Effect<void, ProviderGone>;
  readonly close: Effect.Effect<void>;
}

/** What the stream route calls as the desktop's stream socket delivers bytes or ends. */
export interface EgressStreamHandlers {
  readonly onData: (chunk: Uint8Array) => Effect.Effect<void>;
  /** The desktop side ended, by close frame or socket drop. */
  readonly onEnd: Effect.Effect<void>;
}

type SendToDesktop = (chunk: Uint8Array) => Effect.Effect<void>;

interface PendingStream {
  readonly owner: string;
  readonly ticket: string;
  readonly expiresAt: number;
  used: boolean;
  readonly attached: Deferred.Deferred<SendToDesktop, EgressStreamRefused | ProviderGone>;
  readonly inbound: Queue.Queue<Uint8Array, Queue.Done>;
}

export interface EgressProvider {
  readonly owner: string;
  /** Called by the control socket when the desktop sends a frame. */
  readonly onFrame: (
    frame:
      | { readonly type: "refused"; readonly streamId: string; readonly reason: EgressRefusalReason }
      | { readonly type: "closed"; readonly streamId: string },
  ) => Effect.Effect<void>;
}

export class EgressBroker extends Context.Service<
  EgressBroker,
  {
    /** Registers the owner's control socket. Releasing the scope fails every open stream with ProviderGone. */
    readonly registerProvider: (
      owner: string,
      sendFrame: (frame: EgressOpenFrame) => Effect.Effect<void>,
    ) => Effect.Effect<EgressProvider, never, Scope.Scope>;
    /** Asks the owner's desktop to open a stream. Fails closed with ProviderGone when none is connected. */
    readonly open: (
      owner: string,
      target: { readonly host: string; readonly port: number; readonly profileId: string },
    ) => Effect.Effect<EgressStream, ProviderGone | EgressStreamRefused>;
    /** Consumes a ticket for the stream socket the desktop dialled. Single use, owner-bound. */
    readonly attach: (
      owner: string,
      streamId: string,
      ticket: string,
      send: SendToDesktop,
    ) => Effect.Effect<EgressStreamHandlers, EgressTicketInvalid>;
  }
>()("isnadibot/egress/EgressBroker") {}

export const make = Effect.gen(function* () {
  const providers = new Map<string, (frame: EgressOpenFrame) => Effect.Effect<void>>();
  const streams = new Map<string, PendingStream & { readonly end: Effect.Effect<void> }>();
  const streamsByOwner = new Map<string, Set<string>>();

  const randomId = Effect.sync(() => NodeCrypto.randomBytes(24).toString("base64url"));

  const drop = (streamId: string) =>
    Effect.sync(() => {
      const stream = streams.get(streamId);
      if (stream === undefined) return;
      streams.delete(streamId);
      streamsByOwner.get(stream.owner)?.delete(streamId);
    });

  const failOwnerStreams = (owner: string, error: ProviderGone | EgressStreamRefused) =>
    Effect.forEach(
      [...(streamsByOwner.get(owner) ?? [])],
      (streamId) => {
        const stream = streams.get(streamId);
        if (stream === undefined) return Effect.void;
        return Deferred.fail(stream.attached, error).pipe(
          Effect.andThen(Queue.end(stream.inbound)),
          Effect.andThen(drop(streamId)),
        );
      },
      { discard: true },
    );

  const registerProvider: EgressBroker["Service"]["registerProvider"] = (owner, sendFrame) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        providers.set(owner, sendFrame);
        return {
          owner,
          onFrame: (frame) => {
            const stream = streams.get(frame.streamId);
            // A frame for another owner's stream is ignored.
            if (stream === undefined || stream.owner !== owner) return Effect.void;
            if (frame.type === "refused") {
              return Deferred.fail(stream.attached, new EgressStreamRefused({ reason: frame.reason })).pipe(
                Effect.andThen(Queue.end(stream.inbound)),
                Effect.andThen(drop(frame.streamId)),
              );
            }
            return stream.end;
          },
        } satisfies EgressProvider;
      }),
      () =>
        Effect.suspend(() => {
          providers.delete(owner);
          return failOwnerStreams(owner, new ProviderGone());
        }),
    );

  const open: EgressBroker["Service"]["open"] = (owner, target) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const send = providers.get(owner);
      if (send === undefined) return yield* new ProviderGone();
      const streamId = yield* randomId;
      const ticket = yield* randomId;
      const attached = yield* Deferred.make<SendToDesktop, EgressStreamRefused | ProviderGone>();
      const inbound = yield* Queue.unbounded<Uint8Array, Queue.Done>();
      const end = Queue.end(inbound).pipe(Effect.asVoid, Effect.andThen(drop(streamId)));
      streams.set(streamId, {
        owner,
        ticket,
        expiresAt: now + EGRESS_TICKET_TTL_MS,
        used: false,
        attached,
        inbound,
        end,
      });
      const set = streamsByOwner.get(owner) ?? new Set<string>();
      set.add(streamId);
      streamsByOwner.set(owner, set);

      yield* send({ type: "open", streamId, ticket, ...target });

      // A desktop that never dials back inside the ticket window is treated as a refusal.
      const sendBytes = yield* Deferred.await(attached).pipe(
        Effect.timeoutOrElse({
          duration: EGRESS_TICKET_TTL_MS,
          orElse: () => Effect.fail(new EgressStreamRefused({ reason: "timeout" })),
        }),
        Effect.onError(() => end),
      );
      return {
        streamId,
        inbound,
        write: (chunk) =>
          streams.has(streamId) ? sendBytes(chunk) : Effect.fail(new ProviderGone()),
        close: end,
      } satisfies EgressStream;
    });

  const attach: EgressBroker["Service"]["attach"] = (owner, streamId, ticket, send) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const stream = streams.get(streamId);
      if (
        stream === undefined ||
        stream.owner !== owner ||
        stream.used ||
        stream.ticket !== ticket ||
        now > stream.expiresAt
      ) {
        return yield* new EgressTicketInvalid();
      }
      stream.used = true;
      yield* Deferred.succeed(stream.attached, send);
      return {
        onData: (chunk) => Queue.offer(stream.inbound, chunk).pipe(Effect.asVoid),
        onEnd: stream.end,
      } satisfies EgressStreamHandlers;
    });

  return EgressBroker.of({ registerProvider, open, attach });
});

export const layer = Layer.effect(EgressBroker, make);
