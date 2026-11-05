import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { EgressRefused } from "./EgressDialer.ts";
import { makeEgressProvider } from "./EgressProvider.ts";

const openFrame = {
  type: "open" as const,
  streamId: "s1",
  ticket: "t1",
  host: "10.0.0.1",
  port: 443,
  profileId: "p",
};

const makeHarness = (dial: Parameters<typeof makeEgressProvider>[0]["dial"], maxStreams = 64) => {
  const sent: Array<{ type: string; reason?: string }> = [];
  const links: string[] = [];

  const provider = makeEgressProvider({
    dial,
    openStreamLink: (streamId) =>
      Effect.sync(() => {
        links.push(streamId);

        return {
          send: () => Effect.void,
          run: () => Effect.never,
          close: Effect.void,
        };
      }),
    sendControl: (frame) =>
      Effect.sync(() => {
        sent.push(frame);
      }),
    throttle: () => Effect.void,
    maxStreams,
    idleTimeoutMs: 1_000,
  });

  return { provider, sent, links };
};

describe("EgressProvider", () => {
  it.effect("a server open for a blocked address is refused with no stream socket", () =>
    Effect.gen(function* () {
      const { provider, sent, links } = makeHarness(() =>
        Effect.fail(new EgressRefused({ reason: "blocked-address", host: "10.0.0.1", port: 443 })),
      );

      yield* provider.handleOpen(openFrame);

      assert.deepStrictEqual(sent, [{ type: "refused", streamId: "s1", reason: "blocked-address" }]);
      assert.deepStrictEqual(links, []);
    }),
  );

  it.effect("refuses with stream-limit once the cap is reached", () =>
    Effect.gen(function* () {
      const { provider, sent } = makeHarness(() => Effect.never, 0);

      yield* provider.handleOpen(openFrame);

      assert.deepStrictEqual(sent, [{ type: "refused", streamId: "s1", reason: "stream-limit" }]);
    }),
  );
});
