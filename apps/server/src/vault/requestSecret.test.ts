import { assert, describe, it } from "@effect/vitest";

import type { InjectionTarget } from "./originBinding.ts";
import {
  makeInMemorySecretUseAudit,
  requestSecret,
  type SecretFieldBrowser,
} from "./requestSecret.ts";
import { makeInMemorySecretVault } from "./SecretVault.ts";

const SENTINEL = "s3ntinel-p4ssword-DO-NOT-LEAK";

const BANK = "https://bank.example";

const setup = (frames: ReadonlyArray<InjectionTarget>, failFill = false) => {
  const { vault, reader } = makeInMemorySecretVault(() => 1);
  const audit = makeInMemorySecretUseAudit();
  vault.set({ id: "bank", label: "Bank", origins: [BANK], value: SENTINEL });
  const filled: Array<string> = [];
  let cleared = 0;
  let inspections = 0;
  const filledFor: Array<string> = [];

  const browser: SecretFieldBrowser = {
    inspect: async () => frames[Math.min(inspections++, frames.length - 1)]!,
    fill: async (_field, value, target) => {
      if (failFill) throw new Error("browser exploded");

      filled.push(value);
      filledFor.push(target.documentId);
    },
    clear: async () => void cleared++,
  };

  const run = () =>
    requestSecret(
      { vault, reader, browser, audit, now: () => 2 },
      { credentialId: "bank", botId: "bot-1", field: "#password" },
    );

  return { vault, reader, audit, filled, filledFor, run, cleared: () => cleared };
};

const page = (url: string, fieldFrameUrl = url, documentId = "doc-1"): InjectionTarget => ({
  topFrameUrl: url,
  fieldFrameUrl,
  documentId,
});

describe("requestSecret", () => {
  it("fills on the bound origin and records the use without the value", async () => {
    const t = setup([page(`${BANK}/login`)]);
    assert.deepStrictEqual(await t.run(), { ok: true });
    assert.deepStrictEqual(t.filled, [SENTINEL]);
    assert.deepStrictEqual(t.audit.list(), [
      { credentialId: "bank", label: "Bank", botId: "bot-1", origin: BANK, outcome: "filled", at: 2 },
    ]);
  });

  it("never fills a look-alike origin", async () => {
    const t = setup([page("https://bank.example.evil.test/login")]);
    assert.deepStrictEqual(await t.run(), { ok: false, reason: "origin-not-bound" });
    assert.deepStrictEqual(t.filled, []);
    assert.deepStrictEqual(t.audit.list()[0], {
      credentialId: "bank",
      label: "Bank",
      botId: "bot-1",
      origin: "https://bank.example.evil.test",
      outcome: "refused",
      at: 2,
    });
  });

  it("never fills a cross-origin iframe", async () => {
    const t = setup([page(`${BANK}/`, "https://ads.evil.test/f")]);
    assert.deepStrictEqual(await t.run(), { ok: false, reason: "field-not-in-top-frame" });
    assert.deepStrictEqual(t.filled, []);
  });

  it("clears the field when a redirect lands during the fill", async () => {
    const t = setup([page(`${BANK}/login`), page("https://evil.test/phish")]);
    assert.deepStrictEqual(await t.run(), { ok: false, reason: "redirected-during-fill" });
    assert.strictEqual(t.cleared(), 1);
    assert.strictEqual(t.audit.list()[0]?.outcome, "redirected");
  });

  it("binds the fill to the checked document and catches a navigation to another document", async () => {
    const t = setup([page(`${BANK}/a`, `${BANK}/a`, "doc-1"), page(`${BANK}/b`, `${BANK}/b`, "doc-2")]);
    assert.deepStrictEqual(await t.run(), { ok: false, reason: "redirected-during-fill" });
    assert.deepStrictEqual(t.filledFor, ["doc-1"]);
    assert.strictEqual(t.cleared(), 1);
  });

  it("clears and records a failed fill without carrying the browser error", async () => {
    const t = setup([page(`${BANK}/`)], true);
    const result = await t.run();
    assert.deepStrictEqual(result, { ok: false, reason: "fill-failed" });
    assert.notInclude(JSON.stringify(result), "exploded");
    assert.strictEqual(t.cleared(), 1);
    assert.strictEqual(t.audit.list()[0]?.outcome, "failed");
  });

  it("treats a credential deleted after the lookup as unknown", async () => {
    const t = setup([page(`${BANK}/`)]);

    const result = await requestSecret(
      {
        vault: t.vault,
        reader: { withSecret: async () => false },
        browser: { inspect: async () => page(`${BANK}/`), fill: async () => undefined, clear: async () => undefined },
        audit: t.audit,
      },
      { credentialId: "bank", botId: "bot-1", field: "#password" },
    );

    assert.deepStrictEqual(result, { ok: false, reason: "unknown-credential" });
    assert.deepStrictEqual(t.audit.list(), []);
  });

  it("reports an unknown credential without touching the browser", async () => {
    const t = setup([page(`${BANK}/`)]);
    t.vault.delete("bank");
    assert.deepStrictEqual(await t.run(), { ok: false, reason: "unknown-credential" });
    assert.deepStrictEqual(t.filled, []);
  });

  it("keeps the value out of every result, listing and audit row", async () => {
    const ok = setup([page(`${BANK}/`)]);
    const refused = setup([page("https://evil.test/")]);

    const surfaces = [
      await ok.run(),
      await refused.run(),
      ok.vault.list(),
      ok.vault.find("bank"),
      ok.audit.list(),
      refused.audit.list(),
    ];

    assert.notInclude(JSON.stringify(surfaces), SENTINEL);
  });
});

describe("SecretVault", () => {
  it("rejects a credential with no https origin or an empty value", () => {
    const { vault } = makeInMemorySecretVault();
    assert.deepStrictEqual(vault.set({ id: "a", label: "A", origins: ["http://a.test"], value: "x" }), {
      ok: false,
      reason: "no-valid-origin",
    });
    assert.deepStrictEqual(vault.set({ id: "a", label: "A", origins: [BANK], value: "" }), {
      ok: false,
      reason: "empty-value",
    });
  });

  it("replaces and deletes without ever returning the value", async () => {
    const { vault, reader } = makeInMemorySecretVault();
    vault.set({ id: "a", label: "A", origins: [BANK], value: "one" });
    assert.isTrue(vault.replaceValue("a", "two"));
    const seen: Array<string> = [];
    assert.isTrue(await reader.withSecret("a", (v) => void seen.push(v)));
    assert.deepStrictEqual(seen, ["two"]);
    assert.isTrue(vault.delete("a"));
    assert.isFalse(await reader.withSecret("a", (v) => void seen.push(v)));
    assert.isFalse(vault.replaceValue("a", "three"));
  });

  it("refuses to set over an existing id, so origins cannot be rebound", () => {
    const { vault } = makeInMemorySecretVault();
    vault.set({ id: "a", label: "A", origins: [BANK], value: "one" });
    assert.deepStrictEqual(
      vault.set({ id: "a", label: "A", origins: ["https://evil.test"], value: "one" }),
      { ok: false, reason: "already-exists" },
    );
    assert.deepStrictEqual(vault.find("a")?.origins, [BANK]);
  });
});
