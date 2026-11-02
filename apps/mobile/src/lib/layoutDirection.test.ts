import { describe, expect, it } from "vite-plus/test";

import { layoutDirectionAction, layoutDirectionForPreference } from "./layoutDirection";

describe("layoutDirectionForPreference", () => {
  it("follows the chosen language, and the device for System default", () => {
    expect(layoutDirectionForPreference("en", ["ar-SA"])).toBe("ltr");
    expect(layoutDirectionForPreference("zh-CN", ["ar-SA"])).toBe("ltr");
    expect(layoutDirectionForPreference("system", ["en-US"])).toBe("ltr");
  });
});

describe("layoutDirectionAction", () => {
  it("leaves a layout that already matches the language alone", () => {
    expect(layoutDirectionAction({ wanted: "ltr", nativeIsRTL: false, forced: undefined })).toBe(
      "settled",
    );
    expect(layoutDirectionAction({ wanted: "rtl", nativeIsRTL: true, forced: "rtl" })).toBe(
      "settled",
    );
  });

  it("reloads once when the language needs the other direction", () => {
    expect(layoutDirectionAction({ wanted: "rtl", nativeIsRTL: false, forced: undefined })).toBe(
      "reload",
    );
    expect(layoutDirectionAction({ wanted: "ltr", nativeIsRTL: true, forced: "rtl" })).toBe(
      "reload",
    );
  });

  it("does not reload again when the platform ignored the last request", () => {
    expect(layoutDirectionAction({ wanted: "rtl", nativeIsRTL: false, forced: "rtl" })).toBe(
      "refused",
    );
    expect(layoutDirectionAction({ wanted: "ltr", nativeIsRTL: true, forced: "ltr" })).toBe(
      "refused",
    );
  });
});
