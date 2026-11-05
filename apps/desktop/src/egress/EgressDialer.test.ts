import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { classifyAddress } from "./EgressAddressPolicy.ts";
import { EgressRefused, denyAllHostPolicy, openEgressTarget } from "./EgressDialer.ts";

const PUBLIC_IP = "93.184.216.34";

const grantAll = { allows: () => true };

const makeDeps = (options: {
  readonly lookups: ReadonlyArray<ReadonlyArray<string>>;
  readonly interfaces?: ReadonlyArray<string>;
  readonly hostPolicy?: { readonly allows: (profileId: string, host: string) => boolean };
}) => {
  const calls = { resolve: 0, connect: [] as Array<{ host: string; port: number }> };

  const deps = {
    resolve: (_host: string) =>
      Effect.sync(() => {
        const answer = options.lookups[Math.min(calls.resolve, options.lookups.length - 1)] ?? [];
        calls.resolve += 1;

        return answer;
      }),
    connect: (target: { host: string; port: number }) =>
      Effect.sync(() => {
        calls.connect.push(target);

        return target;
      }),
    hostPolicy: options.hostPolicy ?? grantAll,
    interfaces: () => options.interfaces ?? [],
  };

  return { calls, deps };
};

const refusal = <A>(effect: Effect.Effect<A, EgressRefused>) =>
  Effect.flip(effect).pipe(Effect.map((error) => error.reason));

describe("classifyAddress", () => {
  it("allows ordinary public addresses", () => {
    assert.strictEqual(classifyAddress(PUBLIC_IP, []), "public");
    assert.strictEqual(classifyAddress("2606:4700::1111", []), "public");
  });

  it("blocks metadata, CGNAT and private ranges", () => {
    for (const ip of [
      "169.254.169.254",
      "100.100.100.200",
      "10.0.0.5",
      "172.16.0.1",
      "192.168.1.1",
      "0.0.0.0",
      "224.0.0.1",
      "255.255.255.255",
      "::1",
      "fd00::1",
      "fe80::1",
      "ff02::1",
    ]) {
      assert.isTrue(classifyAddress(ip, []).startsWith("blocked:"), ip);
    }
  });
});

describe("openEgressTarget", () => {
  it.effect("refuses loopback and metadata literals in every spelling", () =>
    Effect.gen(function* () {
      for (const host of [
        "127.0.0.1",
        "2130706433",
        "0x7f000001",
        "0177.0.0.1",
        "[::1]",
        "[::ffff:127.0.0.1]",
        "[::ffff:7f00:1]",
        "[64:ff9b::a9fe:a9fe]",
        "169.254.169.254",
      ]) {
        const { calls, deps } = makeDeps({ lookups: [[PUBLIC_IP]] });
        const reason = yield* refusal(openEgressTarget({ host, port: 443, profileId: "p" }, deps));

        assert.strictEqual(reason, "blocked-address", host);
        assert.strictEqual(calls.resolve, 0, host);
        assert.deepStrictEqual(calls.connect, [], host);
      }
    }),
  );

  it.effect("resolves once and connects to the checked IP, not the name", () =>
    Effect.gen(function* () {
      const { calls, deps } = makeDeps({ lookups: [[PUBLIC_IP], ["127.0.0.1"]] });

      yield* openEgressTarget({ host: "rebind.example", port: 443, profileId: "p" }, deps);

      assert.strictEqual(calls.resolve, 1);
      assert.deepStrictEqual(calls.connect, [{ host: PUBLIC_IP, port: 443 }]);
    }),
  );

  it.effect("refuses when any resolved address is blocked", () =>
    Effect.gen(function* () {
      const { calls, deps } = makeDeps({ lookups: [[PUBLIC_IP, "10.0.0.5"]] });

      const reason = yield* refusal(
        openEgressTarget({ host: "mixed.example", port: 80, profileId: "p" }, deps),
      );

      assert.strictEqual(reason, "blocked-address");
      assert.deepStrictEqual(calls.connect, []);
    }),
  );

  it.effect("refuses ports other than 80 and 443", () =>
    Effect.gen(function* () {
      const { calls, deps } = makeDeps({ lookups: [[PUBLIC_IP]] });

      const reason = yield* refusal(
        openEgressTarget({ host: "site.example", port: 8443, profileId: "p" }, deps),
      );

      assert.strictEqual(reason, "port");
      assert.strictEqual(calls.resolve, 0);
    }),
  );

  it.effect("refuses an ungranted host before any lookup", () =>
    Effect.gen(function* () {
      const { calls, deps } = makeDeps({ lookups: [[PUBLIC_IP]], hostPolicy: denyAllHostPolicy });

      const reason = yield* refusal(
        openEgressTarget({ host: "site.example", port: 443, profileId: "p" }, deps),
      );

      assert.strictEqual(reason, "host-not-granted");
      assert.strictEqual(calls.resolve, 0);
    }),
  );

  it.effect("refuses an address inside one of the PC's own interface subnets", () =>
    Effect.gen(function* () {
      const { calls, deps } = makeDeps({
        lookups: [["2a02:8084:1:2::77"]],
        interfaces: ["2a02:8084:1:2::5/64"],
      });

      const reason = yield* refusal(
        openEgressTarget({ host: "lan.example", port: 443, profileId: "p" }, deps),
      );

      assert.strictEqual(reason, "blocked-address");
      assert.deepStrictEqual(calls.connect, []);
    }),
  );

  it.effect("fails closed when the name does not resolve", () =>
    Effect.gen(function* () {
      const { deps } = makeDeps({ lookups: [[]] });

      const reason = yield* refusal(
        openEgressTarget({ host: "nowhere.example", port: 443, profileId: "p" }, deps),
      );

      assert.strictEqual(reason, "resolve-failed");
    }),
  );
});

describe("host grants for IP literals (TASK-40.1)", () => {
  it.effect("refuses an ungranted public literal and connects once it is granted", () =>
    Effect.gen(function* () {
      const denied = makeDeps({ lookups: [[]], hostPolicy: denyAllHostPolicy });

      const reason = yield* refusal(
        openEgressTarget({ host: PUBLIC_IP, port: 443, profileId: "p" }, denied.deps),
      );

      assert.strictEqual(reason, "host-not-granted");
      assert.deepStrictEqual(denied.calls.connect, []);

      const granted = makeDeps({
        lookups: [[]],
        hostPolicy: { allows: (_profileId, host) => host === PUBLIC_IP },
      });

      yield* openEgressTarget({ host: PUBLIC_IP, port: 443, profileId: "p" }, granted.deps);

      assert.deepStrictEqual(granted.calls.connect, [{ host: PUBLIC_IP, port: 443 }]);
    }),
  );
});

describe("classifyAddress hardening (#110 L1-L6)", () => {
  it("blocks the extra reserved ranges", () => {
    for (const ip of [
      "fec0::1",
      "2001:0:4136:e378:8000:63bf:3fff:fdd2",
      "64:ff9b:1::1",
      "100::1",
      "2001:db8::1",
      "192.88.99.1",
    ]) {
      assert.isTrue(classifyAddress(ip, []).startsWith("blocked:"), ip);
    }
  });

  it("blocks mapped private and 6to4 loopback forms", () => {
    assert.isTrue(classifyAddress("::ffff:10.0.0.1", []).startsWith("blocked:"));
    assert.isTrue(classifyAddress("2002:7f00:1::", []).startsWith("blocked:"));
  });

  it("checks the outer address against the interface subnets before the embedded one", () => {
    assert.strictEqual(
      classifyAddress("2002:5db8:d822::1", ["2002:5db8:d822::5/64"]),
      "blocked:local-interface-subnet",
    );
  });

  it("blocks the /56 around an IPv6 interface, not only its /64", () => {
    assert.strictEqual(
      classifyAddress("2a02:8084:1:2f::9", ["2a02:8084:1:20::5/64"]),
      "blocked:local-interface-subnet",
    );
    assert.strictEqual(classifyAddress("2a02:8084:1:100::9", ["2a02:8084:1:20::5/64"]), "public");
  });

  it("strips a zone id before every check", () => {
    assert.isTrue(classifyAddress("fe80::1%en0", []).startsWith("blocked:"));
    assert.isTrue(classifyAddress("fc00::1%en0", []).startsWith("blocked:"));
  });
});

describe("connect failures", () => {
  it.effect("report connect-failed, not resolve-failed", () =>
    Effect.gen(function* () {
      const { deps } = makeDeps({ lookups: [[PUBLIC_IP]] });

      const reason = yield* refusal(
        openEgressTarget(
          { host: "down.example", port: 443, profileId: "p" },
          { ...deps, connect: () => Effect.fail("ECONNREFUSED") },
        ),
      );

      assert.strictEqual(reason, "connect-failed");
    }),
  );
});
