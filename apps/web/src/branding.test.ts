import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { formatAppDisplayName, resolveServerBackedAppDisplayName } from "./branding.logic";

const originalWindow = globalThis.window;

afterEach(() => {
  vi.resetModules();

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");

    return;
  }

  globalThis.window = originalWindow;
});

describe("branding", () => {
  it("uses injected desktop branding when available", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        desktopBridge: {
          getAppBranding: () => ({
            baseName: "IsnadiBot",
            stageLabel: "Dev",
            displayName: "IsnadiBot (Dev)",
          }),
        },
      },
    });

    const branding = await import("./branding");

    expect(branding.APP_BASE_NAME).toBe("IsnadiBot");
    expect(branding.APP_STAGE_LABEL).toBe("Dev");
    expect(branding.APP_DISPLAY_NAME).toBe("IsnadiBot (Dev)");
  });
});

describe("branding logic", () => {
  it("keeps the fallback display name for stable primary server versions", () => {
    expect(
      resolveServerBackedAppDisplayName({
        baseName: "IsnadiBot",
        fallbackDisplayName: "IsnadiBot",
        fallbackStageLabel: "Alpha",
        primaryServerVersion: "0.0.27",
      }),
    ).toBe("IsnadiBot");
  });

  it("names development builds with their stage and every other build plainly", () => {
    expect(formatAppDisplayName({ baseName: "IsnadiBot", stageLabel: "Dev" })).toBe(
      "IsnadiBot (Dev)",
    );
    expect(formatAppDisplayName({ baseName: "IsnadiBot", stageLabel: "Alpha" })).toBe("IsnadiBot");
  });
});
