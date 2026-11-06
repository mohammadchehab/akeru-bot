import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, describe, it } from "@effect/vitest";

import { resolveMasterKey } from "./masterKey.ts";
import { createInMemorySecretVault } from "./SecretVault.ts";
import { createVaultFileKeyStore, createVaultFilePersistence } from "./vaultFile.ts";

const KEY = Buffer.alloc(32, 7).toString("base64");

const tempFile = () =>
  NodePath.join(NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "vault-")), "vault.json");

const open = (filePath: string, env: Record<string, string>) => {
  const resolved = resolveMasterKey({
    env,
    keychain: { read: () => ({ kind: "unavailable" }), write: () => false },
    store: createVaultFileKeyStore(filePath),
  });

  if (!resolved.ok) throw new Error(resolved.reason);

  return createInMemorySecretVault(Date.now, createVaultFilePersistence(filePath, resolved.key));
};

describe("vault file", () => {
  it("survives a restart, never writes plaintext, and is owner-only", () => {
    const filePath = tempFile();
    const first = open(filePath, { ISNADI_MASTER_KEY: KEY });

    first.vault.set({
      id: "bank",
      label: "Bank",
      origins: ["https://bank.example"],
      value: "hunter2-secret",
    });

    const disk = NodeFS.readFileSync(filePath, "utf8");

    assert.isFalse(disk.includes("hunter2"));
    assert.strictEqual(NodeFS.statSync(filePath).mode & 0o077, 0);

    const second = open(filePath, { ISNADI_MASTER_KEY: KEY });

    assert.deepStrictEqual(second.vault.find("bank")?.origins, ["https://bank.example"]);
  });

  it("reads back the secret and honors replace and delete", async () => {
    const filePath = tempFile();
    const first = open(filePath, { ISNADI_MASTER_KEY: KEY });

    first.vault.set({ id: "a", label: "A", origins: ["https://a.example"], value: "one" });
    first.vault.replaceValue("a", "two");

    const seen: string[] = [];

    await open(filePath, { ISNADI_MASTER_KEY: KEY }).reader.withSecret("a", (v) => {
      seen.push(v);
    });

    assert.deepStrictEqual(seen, ["two"]);

    first.vault.delete("a");

    assert.isUndefined(open(filePath, { ISNADI_MASTER_KEY: KEY }).vault.find("a"));
  });

  it("refuses a different key instead of orphaning the sealed records", () => {
    const filePath = tempFile();

    open(filePath, { ISNADI_MASTER_KEY: KEY }).vault.set({
      id: "a",
      label: "A",
      origins: ["https://a.example"],
      value: "one",
    });

    assert.throws(
      () => open(filePath, { ISNADI_MASTER_KEY: Buffer.alloc(32, 9).toString("base64") }),
      "wrong-key",
    );
  });
});
