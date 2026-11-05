import { assert, describe, it } from "@effect/vitest";

import {
  keychainAccountFor,
  loadKeyringEntryFactory,
  makeKeyringPort,
  type KeyringEntry,
} from "./keychainAdapter.ts";

const KEY = Buffer.alloc(32, 5);

const fake = (entry: Partial<KeyringEntry>) => () => ({
  getPassword: () => null,
  setPassword: () => undefined,
  ...entry,
});

describe("keyring port", () => {
  it("is unavailable when there is no keyring module", () => {
    assert.deepStrictEqual(makeKeyringPort(undefined, "a").read(), { kind: "unavailable" });
  });

  it("maps a missing item to not-found and a stored key to found", () => {
    assert.deepStrictEqual(makeKeyringPort(fake({}), "a").read(), { kind: "not-found" });
    assert.deepStrictEqual(
      makeKeyringPort(fake({ getPassword: () => KEY.toString("base64") }), "a").read(),
      { kind: "found", key: KEY },
    );
  });

  it("maps a locked or denied keychain, and a corrupt item, to error", () => {
    const locked = fake({
      getPassword: () => {
        throw new Error("User interaction is not allowed");
      },
    });

    assert.deepStrictEqual(makeKeyringPort(locked, "a").read(), { kind: "error" });
    assert.deepStrictEqual(makeKeyringPort(fake({ getPassword: () => "c2hvcnQ=" }), "a").read(), {
      kind: "error",
    });
  });

  it("maps a platform with no secure storage to unavailable", () => {
    const none = fake({
      getPassword: () => {
        throw new Error("No storage access");
      },
    });

    assert.deepStrictEqual(makeKeyringPort(none, "a").read(), { kind: "unavailable" });
  });

  it("writes base64 and reports a refused write as false", () => {
    const written: string[] = [];

    assert.isTrue(makeKeyringPort(fake({ setPassword: (p) => written.push(p) }), "a").write(KEY));
    assert.deepStrictEqual(written, [KEY.toString("base64")]);
    assert.isFalse(
      makeKeyringPort(
        fake({
          setPassword: () => {
            throw new Error("denied");
          },
        }),
        "a",
      ).write(KEY),
    );
  });

  it("scopes the account to the home", () => {
    assert.notStrictEqual(keychainAccountFor("/a"), keychainAccountFor("/b"));
  });
});

// Real OS keychain; only when a developer opts in on their own Mac with
// ISNADI_REAL_KEYCHAIN_TEST=1, since it may prompt.
describe.skipIf(process.env.ISNADI_REAL_KEYCHAIN_TEST !== "1")("real macOS keychain", () => {
  it("round-trips a key through the login keychain", () => {
    const factory = loadKeyringEntryFactory();

    assert.isDefined(factory);

    const port = makeKeyringPort(factory, `test-${process.pid}-${Date.now()}`);

    assert.deepStrictEqual(port.read(), { kind: "not-found" });
    assert.isTrue(port.write(KEY));
    assert.deepStrictEqual(port.read(), { kind: "found", key: KEY });
  });
});
