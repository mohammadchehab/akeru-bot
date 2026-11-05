import { assert, describe, it } from "@effect/vitest";

import {
  type KeychainRead,
  type MasterKeyInputs,
  MASTER_KEY_BYTES,
  resolveMasterKey,
} from "./masterKey.ts";

const KEY_A = Buffer.alloc(MASTER_KEY_BYTES, 1);
const KEY_B = Buffer.alloc(MASTER_KEY_BYTES, 2);

type Options = {
  readonly env?: Record<string, string>;
  readonly keychain?: KeychainRead;
  readonly sealed?: number;
  readonly keyCheck?: string;
};

function setup(options: Options = {}) {
  const state = {
    keychain: options.keychain ?? ({ kind: "unavailable" } as KeychainRead),
    keychainWrites: [] as Buffer[],
    salt: undefined as Buffer | undefined,
    keyCheck: options.keyCheck,
  };

  const inputs: MasterKeyInputs = {
    env: options.env ?? {},
    keychain: {
      read: () => state.keychain,
      write: (key) => {
        state.keychainWrites.push(key);
        state.keychain = { kind: "found", key };

        return true;
      },
    },
    store: {
      readSalt: () => state.salt,
      writeSalt: (salt) => {
        state.salt = salt;
      },
      readKeyCheck: () => state.keyCheck,
      writeKeyCheck: (record) => {
        state.keyCheck = record;
      },
      sealedRecordCount: () => options.sealed ?? 0,
    },
  };

  return { state, inputs };
}

describe("resolveMasterKey", () => {
  it("uses the env key first and records a key check", () => {
    const t = setup({
      env: { ISNADI_MASTER_KEY: KEY_A.toString("base64") },
      keychain: { kind: "found", key: KEY_B },
    });
    const result = resolveMasterKey(t.inputs);

    assert.deepStrictEqual(result.ok && [result.source, result.key], ["env", KEY_A]);
    assert.isDefined(t.state.keyCheck);
  });

  it("rejects a malformed env key instead of falling through", () => {
    const t = setup({
      env: { ISNADI_MASTER_KEY: "c2hvcnQ=" },
      keychain: { kind: "found", key: KEY_B },
    });

    assert.deepStrictEqual(resolveMasterKey(t.inputs), { ok: false, reason: "invalid-env-key" });
  });

  it("reads the keychain key when present", () => {
    const t = setup({ keychain: { kind: "found", key: KEY_B } });
    const result = resolveMasterKey(t.inputs);

    assert.deepStrictEqual(result.ok && result.source, "keychain");
    assert.deepStrictEqual(t.state.keychainWrites, []);
  });

  it("generates and stores a key when the keychain is empty and the vault is empty", () => {
    const t = setup({ keychain: { kind: "not-found" } });
    const result = resolveMasterKey(t.inputs);

    assert.strictEqual(t.state.keychainWrites.length, 1);
    assert.deepStrictEqual(result.ok && result.key, t.state.keychainWrites[0]);
  });

  it("fails closed when the keychain is empty but sealed records exist", () => {
    const t = setup({ keychain: { kind: "not-found" }, sealed: 2 });

    assert.deepStrictEqual(resolveMasterKey(t.inputs), {
      ok: false,
      reason: "keychain-key-missing",
    });
    assert.deepStrictEqual(t.state.keychainWrites, []);
  });

  it("fails closed when a key check from an earlier key exists", () => {
    const first = setup({ env: { ISNADI_MASTER_KEY: KEY_A.toString("base64") } });

    resolveMasterKey(first.inputs);

    const t = setup({ keychain: { kind: "not-found" }, keyCheck: first.state.keyCheck });

    assert.deepStrictEqual(resolveMasterKey(t.inputs), {
      ok: false,
      reason: "keychain-key-missing",
    });
  });

  it("never regenerates on a keychain error", () => {
    const t = setup({ keychain: { kind: "error" } });

    assert.deepStrictEqual(resolveMasterKey(t.inputs), { ok: false, reason: "keychain-error" });
    assert.deepStrictEqual(t.state.keychainWrites, []);
  });

  it("derives a stable key from the passphrase and keeps the salt", () => {
    const t = setup({ env: { ISNADI_MASTER_PASSPHRASE: "correct horse" } });
    const first = resolveMasterKey(t.inputs);
    const again = resolveMasterKey(t.inputs);

    assert.isTrue(first.ok && again.ok);
    assert.deepStrictEqual(first.ok && first.key, again.ok && again.key);
    assert.deepStrictEqual(first.ok && first.source, "passphrase");
  });

  it("reports a wrong passphrase without overwriting the key check", () => {
    const t = setup({ env: { ISNADI_MASTER_PASSPHRASE: "right" } });

    resolveMasterKey(t.inputs);

    const check = t.state.keyCheck;
    const wrong = setup({ env: { ISNADI_MASTER_PASSPHRASE: "wrong" }, keyCheck: check });

    wrong.state.salt = t.state.salt;

    assert.deepStrictEqual(resolveMasterKey(wrong.inputs), { ok: false, reason: "wrong-key" });
    assert.strictEqual(wrong.state.keyCheck, check);
  });

  it("disables the vault when no source exists", () => {
    assert.deepStrictEqual(resolveMasterKey(setup().inputs), {
      ok: false,
      reason: "no-master-key-source",
    });
  });
});
