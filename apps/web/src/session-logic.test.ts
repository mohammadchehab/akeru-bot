import { describe, expect, it } from "vite-plus/test";
import { PROVIDER_OPTIONS } from "./session-logic";

describe("provider options", () => {
  it("offers Kimi and Cursor", () => {
    const providers = PROVIDER_OPTIONS.map((option) => String(option.value));
    expect(providers).toContain("kimi");
    expect(providers).toContain("cursor");
  });
});
