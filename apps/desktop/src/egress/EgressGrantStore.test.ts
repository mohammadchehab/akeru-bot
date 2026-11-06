import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";

import { EgressRefused, openEgressTarget } from "./EgressDialer.ts";
import * as EgressGrantStore from "./EgressGrantStore.ts";

const exact = (host: string) => ({ kind: "exact" as const, host });

const suffix = (domain: string) => ({ kind: "suffix" as const, domain });

const withStore = <A, E, R extends FileSystem.FileSystem | Path.Path | Crypto.Crypto | Scope.Scope>(
  body: (input: {
    readonly store: EgressGrantStore.DesktopEgressGrants["Service"];
    readonly grantsPath: string;
    readonly fileSystem: FileSystem.FileSystem;
  }) => Effect.Effect<A, E, R>,
  seed?: string,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fileSystem.makeTempDirectoryScoped();
    const grantsPath = path.join(directory, "egress-grants.json");

    if (seed !== undefined) yield* fileSystem.writeFileString(grantsPath, seed);

    const store = yield* EgressGrantStore.make(grantsPath);

    return yield* body({ store, grantsPath, fileSystem });
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer));

const INSTANCE = "primary";

describe("DesktopEgressGrants", () => {
  it.effect("denies everything by default", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        assert.strictEqual(yield* store.status, "ready");
        assert.isFalse(store.policyFor(INSTANCE).allows("p", "example.com"));
      }),
    ),
  );

  it.effect("a granted host is allowed only for a profile in the binding", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", exact("Example.com."));
        yield* store.setBinding(INSTANCE, ["p"]);

        const policy = store.policyFor(INSTANCE);

        assert.isTrue(policy.allows("p", "example.com"));
        assert.isTrue(policy.allows("p", "EXAMPLE.com."));
        assert.isFalse(policy.allows("p", "other.com"));
        assert.isFalse(policy.allows("q", "example.com"));
        assert.isFalse(store.policyFor("another-backend").allows("p", "example.com"));
      }),
    ),
  );

  it.effect("a profile outside the binding is refused even when it holds a grant", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", exact("example.com"));
        yield* store.setBinding(INSTANCE, ["someone-else"]);

        assert.isFalse(store.policyFor(INSTANCE).allows("p", "example.com"));
      }),
    ),
  );

  it.effect("a wildcard matches the apex and subdomains on a label boundary only", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", suffix("example.com"));
        yield* store.setBinding(INSTANCE, ["p"]);

        const policy = store.policyFor(INSTANCE);

        assert.isTrue(policy.allows("p", "example.com"));
        assert.isTrue(policy.allows("p", "api.example.com"));
        assert.isTrue(policy.allows("p", "a.b.example.com"));
        assert.isTrue(policy.allows("p", "API.Example.COM."));
        assert.isFalse(policy.allows("p", "evil-example.com"));
        assert.isFalse(policy.allows("p", "example.com.evil.com"));
        assert.isFalse(policy.allows("p", "notexample.com"));
      }),
    ),
  );

  it.effect("a wildcard never matches an IP literal", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", suffix("example.com"));
        yield* store.setBinding(INSTANCE, ["p"]);

        assert.isFalse(store.policyFor(INSTANCE).allows("p", "93.184.216.34"));
      }),
    ),
  );

  it.effect("refuses public suffixes, single labels and IP-shaped wildcards", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        for (const domain of ["com", "co.uk", "localhost", "127.0.0.1", "1234", "::1"]) {
          const error = yield* Effect.flip(store.grant("p", suffix(domain)));

          assert.strictEqual(error._tag, "EgressGrantInvalid", domain);
        }

        assert.isFalse(store.policyFor(INSTANCE).allows("p", "example.com"));
      }),
    ),
  );

  it.effect("persists with mode 0600 and survives a reload", () =>
    withStore(({ store, grantsPath, fileSystem }) =>
      Effect.gen(function* () {
        yield* store.setBinding(INSTANCE, ["p"]);
        yield* store.grant("p", exact("example.com"));

        const info = yield* fileSystem.stat(grantsPath);

        assert.strictEqual(info.mode & 0o777, 0o600);

        const reloaded = yield* EgressGrantStore.make(grantsPath);

        assert.isTrue(reloaded.policyFor(INSTANCE).allows("p", "example.com"));
      }),
    ),
  );

  it.effect("a corrupt file denies everything, is left untouched and refuses writes", () =>
    withStore(
      ({ store, grantsPath, fileSystem }) =>
        Effect.gen(function* () {
          assert.strictEqual(yield* store.status, "unreadable");
          assert.isFalse(store.policyFor(INSTANCE).allows("p", "example.com"));

          const error = yield* Effect.flip(store.grant("p", exact("example.com")));

          assert.strictEqual(error._tag, "EgressGrantStoreUnreadable");
          assert.strictEqual(yield* fileSystem.readFileString(grantsPath), "{not json");

          yield* store.reset;

          assert.strictEqual(yield* store.status, "ready");

          yield* store.setBinding(INSTANCE, ["p"]);
          yield* store.grant("p", exact("example.com"));

          assert.isTrue(store.policyFor(INSTANCE).allows("p", "example.com"));
        }),
      "{not json",
    ),
  );

  it.effect("a failed write keeps the old file and the old in-memory grants", () =>
    withStore(({ store, grantsPath, fileSystem }) =>
      Effect.gen(function* () {
        yield* store.setBinding(INSTANCE, ["p"]);
        yield* store.grant("p", exact("example.com"));

        const before = yield* fileSystem.readFileString(grantsPath);

        const failing = yield* EgressGrantStore.make(grantsPath).pipe(
          Effect.provideService(FileSystem.FileSystem, {
            ...fileSystem,
            rename: () =>
              Effect.fail(
                PlatformError.systemError({
                  _tag: "PermissionDenied",
                  module: "FileSystem",
                  method: "rename",
                }),
              ),
          }),
        );

        const error = yield* Effect.flip(failing.grant("p", exact("added.com")));

        assert.strictEqual(error._tag, "EgressGrantWriteError");
        assert.strictEqual(yield* fileSystem.readFileString(grantsPath), before);
        assert.isFalse(failing.policyFor(INSTANCE).allows("p", "added.com"));
        assert.isTrue(failing.policyFor(INSTANCE).allows("p", "example.com"));
      }),
    ),
  );

  it.effect("a revoke removes the grant and publishes the revocation", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.setBinding(INSTANCE, ["p"]);
        yield* store.grant("p", exact("example.com"));

        const received = yield* store.revocations.pipe(
          Stream.take(1),
          Stream.runCollect,
          Effect.forkScoped,
        );

        yield* Effect.forEach(Array.from({ length: 10 }), () => Effect.yieldNow, { discard: true });
        yield* store.revoke("p", exact("example.com"));

        const revocations = yield* Fiber.join(received);

        assert.isFalse(store.policyFor(INSTANCE).allows("p", "example.com"));
        assert.deepStrictEqual(revocations, [{ profileId: "p", host: "example.com" }]);
      }),
    ),
  );
});

describe("the dialer with the grant store", () => {
  const dial = (
    store: EgressGrantStore.DesktopEgressGrants["Service"],
    profileId: string,
    host: string,
    address: string,
  ) => {
    const calls = { resolve: 0, connect: 0 };

    const result = openEgressTarget(
      { host, port: 443, profileId },
      {
        resolve: () =>
          Effect.sync(() => {
            calls.resolve += 1;

            return [address];
          }),
        connect: (target) =>
          Effect.sync(() => {
            calls.connect += 1;

            return target;
          }),
        hostPolicy: store.policyFor(INSTANCE),
        interfaces: () => [],
      },
    ).pipe(
      Effect.flip,
      Effect.map((error: EgressRefused) => error.reason),
    );

    return { calls, result };
  };

  it.effect("a profile outside the binding is refused before any DNS or TCP", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", exact("example.com"));
        yield* store.setBinding(INSTANCE, ["someone-else"]);

        const { calls, result } = dial(store, "p", "example.com", "93.184.216.34");

        assert.strictEqual(yield* result, "host-not-granted");
        assert.deepStrictEqual(calls, { resolve: 0, connect: 0 });
      }),
    ),
  );

  it.effect("a wildcard-granted subdomain that resolves to a private address is blocked", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", suffix("example.com"));
        yield* store.setBinding(INSTANCE, ["p"]);

        const { calls, result } = dial(store, "p", "intranet.example.com", "10.0.0.5");

        assert.strictEqual(yield* result, "blocked-address");
        assert.strictEqual(calls.connect, 0);
      }),
    ),
  );

  it.effect("a granted host that resolves to a public address connects once", () =>
    withStore(({ store }) =>
      Effect.gen(function* () {
        yield* store.grant("p", suffix("example.com"));
        yield* store.setBinding(INSTANCE, ["p"]);

        const calls = { resolve: 0, connect: [] as Array<string> };

        yield* openEgressTarget(
          { host: "api.example.com", port: 443, profileId: "p" },
          {
            resolve: () =>
              Effect.sync(() => {
                calls.resolve += 1;

                return ["93.184.216.34"];
              }),
            connect: (target) =>
              Effect.sync(() => {
                calls.connect.push(target.host);

                return target;
              }),
            hostPolicy: store.policyFor(INSTANCE),
            interfaces: () => [],
          },
        );

        assert.strictEqual(calls.resolve, 1);
        assert.deepStrictEqual(calls.connect, ["93.184.216.34"]);
      }),
    ),
  );
});
