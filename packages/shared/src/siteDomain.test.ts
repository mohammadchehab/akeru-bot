import { assert, describe, it } from "@effect/vitest";

import { hasRegistrableDomain, normalizeHost } from "./siteDomain.ts";

describe("normalizeHost", () => {
  it("folds case, trailing dots and numeric IPv4 spellings", () => {
    assert.strictEqual(normalizeHost("Example.COM."), "example.com");
    assert.strictEqual(normalizeHost("0x7f000001"), "127.0.0.1");
    assert.strictEqual(normalizeHost("2130706433"), "127.0.0.1");
    assert.strictEqual(normalizeHost("[::1]"), "::1");
  });

  it("fails closed on a host that does not parse, including a zoned IPv6 literal", () => {
    assert.strictEqual(normalizeHost("[::1%lo0]"), null);
    assert.strictEqual(normalizeHost("exa mple.com"), null);
  });
});

describe("hasRegistrableDomain", () => {
  it("needs a label below a public suffix", () => {
    assert.isTrue(hasRegistrableDomain("example.com"));
    assert.isTrue(hasRegistrableDomain("a.example.co.uk"));
    assert.isFalse(hasRegistrableDomain("com"));
    assert.isFalse(hasRegistrableDomain("co.uk"));
    assert.isFalse(hasRegistrableDomain("localhost"));
  });
});
