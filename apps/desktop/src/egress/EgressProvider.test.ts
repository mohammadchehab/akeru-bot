import { assert, describe, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";

import { EgressRefused } from "./EgressDialer.ts";
import { BYTES_PER_SECOND, makeTokenBucket, STREAM_IDLE_TIMEOUT_MS } from "./EgressLimits.ts";
import { makeEgressProvider, type EgressTarget } from "./EgressProvider.ts";

const openFrame = {
  type: "open" as const,
  streamId: "s1",
  ticket: "t1",
  host: "10.0.0.1",
  port: 443,
  profileId: "p",
};

/** Lets forked stream fibers run until they park. */
const settle = Effect.forEach(Array.from({ length: 10 }), () => Effect.yieldNow, { discard: true });

const makeHarness = (
  dial: Parameters<typeof makeEgressProvider>[0]["dial"],
  options: {
    readonly maxStreams?: number;
    readonly throttle?: (bytes: number) => Effect.Effect<void>;
  } = {},
) => {
  const sent: Array<{ type: string; reason?: string }> = [];
  const links: string[] = [];
  const sentToServer: Uint8Array[] = [];
  const state = { linkClosed: 0 };

  const provider = makeEgressProvider({
    dial,
    openStreamLink: (streamId) =>
      Effect.sync(() => {
        links.push(streamId);

        return {
          send: (chunk) =>
            Effect.sync(() => {
              sentToServer.push(chunk);
            }),
          run: () => Effect.never,
          close: Effect.sync(() => {
            state.linkClosed += 1;
          }),
        };
      }),
    sendControl: (frame) =>
      Effect.sync(() => {
        sent.push(frame);
      }),
    throttle: options.throttle ?? (() => Effect.void),
    maxStreams: options.maxStreams ?? 64,
    idleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
  });

  return { provider, sent, links, sentToServer, state };
};

/** A target that never produces data and counts its destroys. */
const quietTarget = () => {
  const state = { destroyed: 0 };

  const target: EgressTarget = {
    run: () => Effect.never,
    write: () => Effect.void,
    destroy: Effect.sync(() => {
      state.destroyed += 1;
    }),
  };

  return { target, state };
};

describe("EgressProvider", () => {
  it.effect("a server open for a blocked address is refused with no stream socket", () =>
    Effect.gen(function* () {
      const { provider, sent, links } = makeHarness(() =>
        Effect.fail(new EgressRefused({ reason: "blocked-address", host: "10.0.0.1", port: 443 })),
      );

      yield* provider.handleOpen(openFrame);
      yield* settle;

      assert.deepStrictEqual(sent, [{ type: "refused", streamId: "s1", reason: "blocked-address" }]);
      assert.deepStrictEqual(links, []);
    }),
  );

  it.effect("refuses with stream-limit once the cap is reached", () =>
    Effect.gen(function* () {
      const { provider, sent } = makeHarness(() => Effect.never, { maxStreams: 0 });

      yield* provider.handleOpen(openFrame);
      yield* settle;

      assert.deepStrictEqual(sent, [{ type: "refused", streamId: "s1", reason: "stream-limit" }]);
    }),
  );

  it.effect("a slow dial does not block the next open frame", () =>
    Effect.gen(function* () {
      const { provider, sent } = makeHarness((request) =>
        request.host === "slow"
          ? Effect.never
          : Effect.fail(new EgressRefused({ reason: "blocked-address", host: request.host, port: 1 })),
      );

      yield* provider.handleOpen({ ...openFrame, streamId: "slow", host: "slow" });
      yield* provider.handleOpen({ ...openFrame, streamId: "fast", host: "fast" });
      yield* settle;

      assert.deepStrictEqual(sent, [{ type: "refused", streamId: "fast", reason: "blocked-address" }]);
    }),
  );

  it.effect("closes an idle stream after 5 minutes and reports it closed", () =>
    Effect.gen(function* () {
      const { target, state: targetState } = quietTarget();
      const { provider, sent, state } = makeHarness(() => Effect.succeed(target));

      yield* provider.handleOpen(openFrame);
      yield* settle;
      yield* TestClock.adjust(STREAM_IDLE_TIMEOUT_MS - 1);
      yield* settle;

      assert.strictEqual(targetState.destroyed, 0);

      yield* TestClock.adjust(1);
      yield* settle;

      assert.strictEqual(targetState.destroyed, 1);
      assert.strictEqual(state.linkClosed, 1);
      assert.deepStrictEqual(sent, [{ type: "closed", streamId: "s1" }]);
      assert.strictEqual(provider.liveStreams(), 0);
    }),
  );

  it.effect("throttles a session to 5 MiB per second", () =>
    Effect.gen(function* () {
      const bucket = makeTokenBucket(BYTES_PER_SECOND, 0);

      const chunk = new Uint8Array(BYTES_PER_SECOND);

      const target: EgressTarget = {
        run: (onData) => onData(chunk).pipe(Effect.andThen(onData(chunk)), Effect.andThen(Effect.never)),
        write: () => Effect.void,
        destroy: Effect.void,
      };

      const { provider, sentToServer } = makeHarness(() => Effect.succeed(target), {
        throttle: (bytes) =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) => Effect.sleep(bucket.take(bytes, now))),
          ),
      });

      yield* provider.handleOpen(openFrame);
      yield* settle;

      assert.strictEqual(sentToServer.length, 1);

      yield* TestClock.adjust(999);
      yield* settle;

      assert.strictEqual(sentToServer.length, 1);

      yield* TestClock.adjust(1);
      yield* settle;

      assert.strictEqual(sentToServer.length, 2);
    }),
  );

  it.effect("shutdown on control close destroys every live stream", () =>
    Effect.gen(function* () {
      const first = quietTarget();
      const second = quietTarget();
      const targets = [first.target, second.target];
      let next = 0;

      const { provider, state } = makeHarness(() => Effect.succeed(targets[next++] ?? first.target));

      yield* provider.handleOpen(openFrame);
      yield* provider.handleOpen({ ...openFrame, streamId: "s2" });
      yield* settle;

      assert.strictEqual(provider.liveStreams(), 2);

      yield* provider.shutdown;
      yield* settle;

      assert.strictEqual(first.state.destroyed, 1);
      assert.strictEqual(second.state.destroyed, 1);
      assert.strictEqual(state.linkClosed, 2);
      assert.strictEqual(provider.liveStreams(), 0);
    }),
  );
});
