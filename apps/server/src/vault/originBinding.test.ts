import { assert, describe, it } from "@effect/vitest";

import { checkInjectionTarget, normalizeHttpsOrigin } from "./originBinding.ts";

const BOUND = ["https://bank.example"];
const at = (topFrameUrl: string, fieldFrameUrl = topFrameUrl) => ({ topFrameUrl, fieldFrameUrl, documentId: "doc-1" });

describe("normalizeHttpsOrigin", () => {
  it("keeps scheme, host and port only", () => {
    assert.strictEqual(
      normalizeHttpsOrigin("https://Bank.Example:443/login?x=1#y"),
      "https://bank.example",
    );
    assert.strictEqual(normalizeHttpsOrigin("https://bank.example:8443/"), "https://bank.example:8443");
  });

  it("rejects http, userinfo, opaque and unparseable input", () => {
    assert.isNull(normalizeHttpsOrigin("http://bank.example"));
    assert.isNull(normalizeHttpsOrigin("https://user:pw@bank.example"));
    assert.isNull(normalizeHttpsOrigin("about:blank"));
    assert.isNull(normalizeHttpsOrigin("not a url"));
  });
});

describe("checkInjectionTarget", () => {
  it("allows the bound origin on any path", () => {
    assert.deepStrictEqual(checkInjectionTarget(BOUND, at("https://bank.example/login")), {
      allowed: true,
      origin: "https://bank.example",
    });
  });

  it("refuses look-alike, sibling, subdomain and port-different origins", () => {
    for (const url of [
      "https://bank.example.evil.test/login",
      "https://evil-bank.example/",
      "https://login.bank.example/",
      "https://bank.example:8443/",
      "https://bank.example@evil.test/",
    ]) {
      assert.deepStrictEqual(checkInjectionTarget(BOUND, at(url)), {
        allowed: false,
        reason: "origin-not-bound",
      });
    }
  });

  it("refuses plain http even when the host matches", () => {
    assert.deepStrictEqual(checkInjectionTarget(BOUND, at("http://bank.example/")), {
      allowed: false,
      reason: "top-frame-not-https",
    });
  });

  it("refuses a field inside a cross-origin iframe of a bound page", () => {
    assert.deepStrictEqual(
      checkInjectionTarget(BOUND, at("https://bank.example/", "https://ads.evil.test/frame")),
      { allowed: false, reason: "field-not-in-top-frame" },
    );
  });

  it("refuses a bound iframe embedded in an unbound top frame", () => {
    assert.deepStrictEqual(
      checkInjectionTarget(BOUND, at("https://evil.test/", "https://bank.example/login")),
      { allowed: false, reason: "origin-not-bound" },
    );
  });

  it("supports several bound origins and refuses an empty binding", () => {
    const two = ["https://bank.example", "https://sso.bank.example"];
    assert.strictEqual(checkInjectionTarget(two, at("https://sso.bank.example/")).allowed, true);
    assert.strictEqual(checkInjectionTarget([], at("https://bank.example/")).allowed, false);
  });
});
