import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, describe, it } from "@effect/vitest";

import { openVault } from "./openVault.ts";

const KEY = Buffer.alloc(32, 9).toString("base64");

const tempHome = () => NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "open-vault-"));

const open = (homeDir: string, env: Record<string, string>) =>
  openVault({ homeDir, stateDir: homeDir, env, createKeyringEntry: undefined });

describe("openVault", () => {
  it("stays closed with no key source", () => {
    assert.deepStrictEqual(open(tempHome(), {}), { ok: false, reason: "no-master-key-source" });
  });

  it("keeps credentials across a restart with the same key", () => {
    const home = tempHome();
    const first = open(home, { ISNADI_MASTER_KEY: KEY });

    assert.isTrue(first.ok);

    if (!first.ok) return;

    first.vault.set({ id: "c1", label: "Site", origins: ["https://example.com"], value: "s3cret" });

    const second = open(home, { ISNADI_MASTER_KEY: KEY });

    assert.isTrue(second.ok);

    if (!second.ok) return;

    assert.deepStrictEqual(
      second.vault.list().map((c) => c.id),
      ["c1"],
    );
  });

  it("fails closed on a wrong key and leaves the file untouched", () => {
    const home = tempHome();
    const first = open(home, { ISNADI_MASTER_KEY: KEY });

    if (!first.ok) throw new Error(first.reason);

    first.vault.set({ id: "c1", label: "Site", origins: ["https://example.com"], value: "s3cret" });

    const before = NodeFS.readFileSync(NodePath.join(home, "vault.json"), "utf8");
    const wrong = open(home, { ISNADI_MASTER_KEY: Buffer.alloc(32, 1).toString("base64") });

    assert.deepStrictEqual(wrong, { ok: false, reason: "wrong-key" });
    assert.strictEqual(NodeFS.readFileSync(NodePath.join(home, "vault.json"), "utf8"), before);
  });

  it("reports an unreadable vault file instead of throwing", () => {
    const home = tempHome();

    NodeFS.writeFileSync(NodePath.join(home, "vault.json"), "not json");

    assert.deepStrictEqual(open(home, { ISNADI_MASTER_KEY: KEY }), {
      ok: false,
      reason: "vault-file-unreadable",
    });
  });
});
