import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";
import { HANDLED_TURN_REQUEST_KEY_TTL } from "./Fields.ts";
import { createHandledRequests } from "./HandledRequests.ts";

it.effect("lets exactly one of two concurrent claims of a key through", () =>
  Effect.gen(function* () {
    const handled = createHandledRequests({
      capacity: 10,
      timeToLive: HANDLED_TURN_REQUEST_KEY_TTL,
    });

    const seen = yield* Effect.all([handled.claim("command:a"), handled.claim("command:a")], {
      concurrency: "unbounded",
    });

    assert.deepStrictEqual(seen.toSorted(), [false, true]);
  }),
);

it.effect("treats a key as new again once its time to live has passed", () =>
  Effect.gen(function* () {
    const handled = createHandledRequests({
      capacity: 10,
      timeToLive: HANDLED_TURN_REQUEST_KEY_TTL,
    });

    assert.isFalse(yield* handled.claim("command:a"));
    assert.isTrue(yield* handled.claim("command:a"));

    yield* TestClock.adjust(HANDLED_TURN_REQUEST_KEY_TTL);
    yield* TestClock.adjust("1 millis");

    assert.isFalse(yield* handled.claim("command:a"));
  }),
);

it.effect("forgets the oldest key when the capacity is reached", () =>
  Effect.gen(function* () {
    const handled = createHandledRequests({
      capacity: 2,
      timeToLive: HANDLED_TURN_REQUEST_KEY_TTL,
    });

    yield* handled.claim("command:a");
    yield* handled.claim("command:b");
    yield* handled.claim("command:c");

    assert.isFalse(yield* handled.claim("command:a"));
    assert.isTrue(yield* handled.claim("command:c"));
  }),
);
