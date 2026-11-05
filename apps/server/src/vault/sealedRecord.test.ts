import { assert, describe, it } from "@effect/vitest";

import { openValue, sealValue } from "./sealedRecord.ts";

const KEY = Buffer.alloc(32, 1);

describe("sealed record", () => {
  it("round-trips and never contains the plaintext", () => {
    const sealed = sealValue(KEY, "a", "hunter2-secret");

    assert.isFalse(sealed.includes("hunter2"));
    assert.strictEqual(openValue(KEY, "a", sealed), "hunter2-secret");
  });

  it("refuses a wrong key, another id, and a tampered body", () => {
    const sealed = sealValue(KEY, "a", "pw");
    const [iv, tag] = sealed.split(".");

    assert.isUndefined(openValue(Buffer.alloc(32, 2), "a", sealed));
    assert.isUndefined(openValue(KEY, "b", sealed));
    assert.isUndefined(openValue(KEY, "a", `${iv}.${tag}.${Buffer.from("x").toString("base64")}`));
    assert.isUndefined(openValue(KEY, "a", "garbage"));
  });
});
