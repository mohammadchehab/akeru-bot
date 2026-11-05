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

const setup = (frames: ReadonlyArray<InjectionTarget>) => {
  const vault = makeInMemorySecretVault(() => 1);
  const audit = makeInMemorySecretUseAudit();
  vault.set({ id: "bank", label: "Bank", origins: [BANK], value: SENTINEL });
  const filled: Array<string> = [];
  let cleared = 0;
  let inspections = 0;
  const browser: SecretFieldBrowser = {
    inspect: async () => frames[Math.min(inspections++, frames.length - 1)]!,
    fill: async (_field, value) => void filled.push(value),
    clear: async () => void cleared++,
  };
  const run = () =>
    requestSecret(
      { vault, browser, audit, now: () => 2 },
      { credentialId: "bank", botId: "bot-1", field: "#password" },
    );
  return { vault, audit, filled, run, cleared: () => cleared };
};

const page = (url: string, fieldFrameUrl = url): InjectionTarget => ({
  topFrameUrl: url,
  fieldFrameUrl,
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
    assert.strictEqual(t.audit.list()[0]?.outcome, "refused");
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
    const vault = makeInMemorySecretVault();
    assert.deepStrictEqual(vault.set({ id: "a", label: "A", origins: ["http://a.test"], value: "x" }), {
      ok: false,
      reason: "no-valid-origin",
    });
    assert.deepStrictEqual(vault.set({ id: "a", label: "A", origins: [BANK], value: "" }), {
      ok: false,
      reason: "empty-value",
    });
  });

  it("replaces and deletes without ever returning the value", () => {
    const vault = makeInMemorySecretVault();
    vault.set({ id: "a", label: "A", origins: [BANK], value: "one" });
    assert.isTrue(vault.replaceValue("a", "two"));
    assert.strictEqual(vault.withSecret("a", (v) => v), "two");
    assert.isTrue(vault.delete("a"));
    assert.isUndefined(vault.withSecret("a", (v) => v));
    assert.isFalse(vault.replaceValue("a", "three"));
  });
});
