import { assert, describe, it } from "@effect/vitest";
import type { EgressOpenFrame } from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";

import { serveEgressControl } from "./DesktopEgress.ts";
import type { EgressSocketLink } from "./EgressWebSocket.ts";

const encode = (value: EgressOpenFrame | { readonly type: "nonsense" }) => new TextEncoder().encode(JSON.stringify(value));

const makeControl = (frames: ReadonlyArray<Uint8Array>) => {
  const sent: Array<string> = [];

  const control: EgressSocketLink = {
    send: (data) =>
      Effect.sync(() => {
        sent.push(Predicate.isString(data) ? data : new TextDecoder().decode(data));
      }),
    // The socket stays open long enough for forked streams to answer, then closes.
    run: (onMessage) =>
      Effect.forEach(frames, (frame) => onMessage(frame, true), { discard: true }).pipe(
        Effect.andThen(Effect.forEach(Array.from({ length: 10 }), () => Effect.yieldNow)),
        Effect.asVoid,
      ),
    close: Effect.void,
  };

  return { control, sent };
};

const openStream = () => Effect.die("no stream should open");

describe("serveEgressControl", () => {
  it.effect("refuses a host with no grant before any TCP", () =>
    Effect.gen(function* () {
      const { control, sent } = makeControl([
        encode({
          type: "open",
          streamId: "s1",
          ticket: "t1",
          host: "example.com",
          port: 443,
          profileId: "p",
        }),
      ]);

      yield* serveEgressControl({ control, openStream });

      assert.deepStrictEqual(sent.map((text) => JSON.parse(text)), [
        { type: "refused", streamId: "s1", reason: "host-not-granted" },
      ]);
    }),
  );

  it.effect("ignores frames that are not valid open frames", () =>
    Effect.gen(function* () {
      const { control, sent } = makeControl([
        encode({ type: "nonsense" }),
        new TextEncoder().encode("not json"),
      ]);

      yield* serveEgressControl({ control, openStream });

      assert.deepStrictEqual(sent, []);
    }),
  );
});
