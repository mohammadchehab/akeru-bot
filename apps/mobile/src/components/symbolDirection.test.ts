import { describe, expect, it } from "vite-plus/test";

import { mirroredInRtl } from "./symbolDirection";

describe("mirroredInRtl", () => {
  it("mirrors the back and forward symbols only in a right-to-left layout", () => {
    expect(mirroredInRtl("chevron.right", true)).toBe(true);
    expect(mirroredInRtl("chevron.left", true)).toBe(true);
    expect(mirroredInRtl("chevron.right", false)).toBe(false);
  });

  it("leaves symbols that carry no reading direction alone", () => {
    expect(mirroredInRtl("chevron.down", true)).toBe(false);
    expect(mirroredInRtl("checkmark", true)).toBe(false);
    expect(mirroredInRtl(undefined, true)).toBe(false);
  });
});
