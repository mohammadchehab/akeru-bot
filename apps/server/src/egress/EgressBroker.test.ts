import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as TestClock from "effect/testing/TestClock";
import type { EgressOpenFrame } from "@isnadi/contracts";
import * as EgressBroker from "./EgressBroker.ts";

const target = { host: "example.com", port: 443, profileId: "p1" };

const noop = () => Effect.void;

const setup = Effect.gen(function* () {
  const broker = yield* EgressBroker.make;
  const sent: EgressOpenFrame[] = [];

  const provider = yield* broker.registerProvider("owner-a", (frame) =>
    Effect.sync(() => {
      sent.push(frame);
    }),
  );

  return { broker, sent, provider };
});

const startOpen = (broker: EgressBroker.EgressBroker["Service"], owner = "owner-a") =>
  Effect.forkChild(broker.open(owner, target));

describe("EgressBroker", () => {
  it.effect("fails closed with ProviderGone when no provider is registered", () =>
    Effect.gen(function* () {
      const broker = yield* EgressBroker.make;
      const exit = yield* Effect.exit(broker.open("owner-a", target));
      assert.isTrue(Exit.isFailure(exit));
    }),
  );

  it.effect("a ticket attaches once, for its owner and stream, then is spent", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const { broker, sent } = yield* setup;
        const fiber = yield* startOpen(broker);
        yield* Effect.yieldNow;
        const frame = sent[0]!;
        const wrongOwner = yield* Effect.exit(broker.attach("owner-b", frame.streamId, frame.ticket, noop));
        const wrongTicket = yield* Effect.exit(broker.attach("owner-a", frame.streamId, "nope", noop));
        const wrongStream = yield* Effect.exit(broker.attach("owner-a", "other", frame.ticket, noop));
        assert.isTrue(Exit.isFailure(wrongOwner));
        assert.isTrue(Exit.isFailure(wrongTicket));
        assert.isTrue(Exit.isFailure(wrongStream));
        yield* broker.attach("owner-a", frame.streamId, frame.ticket, noop);
        const replay = yield* Effect.exit(broker.attach("owner-a", frame.streamId, frame.ticket, noop));
        assert.isTrue(Exit.isFailure(replay));
        const stream = yield* Fiber.join(fiber);
        assert.strictEqual(stream.streamId, frame.streamId);
      }),
    ),
  );

  it.effect("a ticket is dead after ten seconds", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const { broker, sent } = yield* setup;
        const fiber = yield* startOpen(broker);
        yield* Effect.yieldNow;
        const frame = sent[0]!;
        yield* TestClock.adjust(EgressBroker.EGRESS_TICKET_TTL_MS + 1);
        const late = yield* Effect.exit(broker.attach("owner-a", frame.streamId, frame.ticket, noop));
        assert.isTrue(Exit.isFailure(late));
        assert.isTrue(Exit.isFailure(yield* Fiber.await(fiber)));
      }),
    ),
  );

  it.effect("a refusal from the desktop fails the open with its reason", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const { broker, sent, provider } = yield* setup;
        const fiber = yield* startOpen(broker);
        yield* Effect.yieldNow;
        yield* provider.onFrame({ type: "refused", streamId: sent[0]!.streamId, reason: "blocked-address" });
        const exit = yield* Fiber.await(fiber);
        assert.isTrue(Exit.isFailure(exit));
      }),
    ),
  );

  it.effect("bytes flow both ways and a closed frame ends the inbound queue", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const { broker, sent, provider } = yield* setup;
        const fiber = yield* startOpen(broker);
        yield* Effect.yieldNow;
        const frame = sent[0]!;
        const toDesktop: Uint8Array[] = [];

        const handlers = yield* broker.attach("owner-a", frame.streamId, frame.ticket, (chunk) =>
          Effect.sync(() => {
            toDesktop.push(chunk);
          }),
        );

        const stream = yield* Fiber.join(fiber);
        yield* stream.write(new Uint8Array([1]));
        yield* handlers.onData(new Uint8Array([2]));
        assert.deepStrictEqual(toDesktop, [new Uint8Array([1])]);
        assert.deepStrictEqual(yield* Queue.take(stream.inbound), new Uint8Array([2]));
        yield* provider.onFrame({ type: "closed", streamId: frame.streamId });
        assert.isTrue(Exit.isFailure(yield* Effect.exit(Queue.take(stream.inbound))));
      }),
    ),
  );

  it.effect("a dropped control socket ends every open stream with ProviderGone", () =>
    Effect.gen(function* () {
      const broker = yield* EgressBroker.make;
      const sent: EgressOpenFrame[] = [];

      const fiber = yield* Effect.scoped(
        Effect.gen(function* () {
          yield* broker.registerProvider("owner-a", (frame) => Effect.sync(() => void sent.push(frame)));
          const pending = yield* startOpen(broker);
          yield* Effect.yieldNow;

          return pending;
        }),
      );

      const exit = yield* Fiber.await(fiber);
      assert.isTrue(Exit.isFailure(exit));
      assert.isTrue(Exit.isFailure(yield* Effect.exit(broker.open("owner-a", target))));
    }),
  );
});
