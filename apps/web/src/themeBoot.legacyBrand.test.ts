import { describe, expect, it } from "vite-plus/test";
import { THEME_STORAGE_KEY, runBootScript } from "./themeBoot.test-support";

// The product shipped as Akeru before the Isnadi rename.
const LEGACY_BRAND = "akeru";

describe("index.html boot script legacy-brand migration", () => {
  it("moves legacy-prefixed keys onto the isnadi prefix and rewrites theme ids", () => {
    const result = runBootScript({
      storage: {
        [`${LEGACY_BRAND}:theme`]: `${LEGACY_BRAND}-noir`,
        [`${LEGACY_BRAND}:theme-halves:v1`]: JSON.stringify({
          light: `${LEGACY_BRAND}-paper`,
          dark: `${LEGACY_BRAND}-chat`,
        }),
        [`${LEGACY_BRAND}.mobile-theme`]: `${LEGACY_BRAND}-classic`,
        [`${LEGACY_BRAND}:unrelated`]: `${LEGACY_BRAND}-noirish keep`,
        "other:key": `${LEGACY_BRAND}-noir`,
      },
      prefersDark: false,
    });

    expect(result.storage).toEqual({
      [THEME_STORAGE_KEY]: "isnadi-noir",
      "isnadi:theme-halves:v1": JSON.stringify({ light: "isnadi-paper", dark: "isnadi-chat" }),
      "isnadi.mobile-theme": "isnadi-classic",
      "isnadi:unrelated": `${LEGACY_BRAND}-noirish keep`,
      "other:key": `${LEGACY_BRAND}-noir`,
    });
  });

  it("migrates before the theme is read, so the boot applies the moved preference", () => {
    const result = runBootScript({
      storage: { [`${LEGACY_BRAND}:theme`]: `${LEGACY_BRAND}-noir` },
      prefersDark: false,
    });

    expect(result.storage).toEqual({ [THEME_STORAGE_KEY]: "isnadi-noir" });
    expect(result.themeId).toBe("isnadi-noir");
  });

  it("keeps an existing isnadi value and still drops the legacy key", () => {
    const result = runBootScript({
      storage: {
        [`${LEGACY_BRAND}:theme`]: `${LEGACY_BRAND}-noir`,
        [THEME_STORAGE_KEY]: "isnadi-paper",
      },
      prefersDark: false,
    });

    expect(result.storage).toEqual({ [THEME_STORAGE_KEY]: "isnadi-paper" });
    expect(result.themeId).toBe("isnadi-paper");
  });

  it("resolves a stored legacy theme id that was never migrated", () => {
    const result = runBootScript({
      storage: { [THEME_STORAGE_KEY]: `${LEGACY_BRAND}-paper` },
      prefersDark: false,
    });

    expect(result.themeId).toBe("isnadi-paper");
  });
});
