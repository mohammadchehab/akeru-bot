import { describe, expect, it } from "vite-plus/test";

import { resolveSelectedThemeCardId, standardThemePreference } from "./ThemeSettings";

describe("resolveSelectedThemeCardId", () => {
  it("marks Isnadi Classic only when it owns the visible appearance", () => {
    expect(
      resolveSelectedThemeCardId({
        appearanceMode: "light",
        initialAppearance: "dark",
        lightOwner: null,
        darkOwner: "isnadi-paper",
      }),
    ).toBeNull();
  });

  it("marks Isnadi Paper for dark mode and the active system appearance", () => {
    const input = {
      initialAppearance: "dark" as const,
      lightOwner: null,
      darkOwner: "isnadi-paper",
    };

    expect(resolveSelectedThemeCardId({ ...input, appearanceMode: "dark" })).toBe("isnadi-paper");
    expect(resolveSelectedThemeCardId({ ...input, appearanceMode: "system" })).toBe("isnadi-paper");
  });
});

describe("standardThemePreference", () => {
  it("keeps system appearance while storing the visible Classic palette", () => {
    expect(standardThemePreference("system", "dark")).toBe("dark");
    expect(standardThemePreference("system", "light")).toBe("light");
  });
});
