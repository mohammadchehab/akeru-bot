import { describe, expect, it, vi } from "vite-plus/test";
import { translate } from "@isnadi/client-runtime/i18n";
import {
  mobileLanguages,
  normalizeLanguagePreference,
  readDeviceLocales,
  resolveMobileLanguage,
} from "./languagePreferences";

describe("mobile language preferences", () => {
  it("defaults to the device locale and retains English regional formatting", () => {
    expect(resolveMobileLanguage(undefined, ["en-GB"])).toEqual({
      preference: "system",
      locale: "en-GB",
    });
    expect(resolveMobileLanguage("system", ["ja-JP", "en-AU"])).toEqual({
      preference: "system",
      locale: "en-AU",
    });
  });

  it("supports an explicit English override and resetting to system", () => {
    expect(resolveMobileLanguage("en", ["en-GB"])).toEqual({ preference: "en", locale: "en" });
    expect(resolveMobileLanguage("zh-CN", ["en-GB"])).toEqual({
      preference: "zh-CN",
      locale: "zh-CN",
    });
    expect(resolveMobileLanguage("system", ["en-GB"])).toEqual({
      preference: "system",
      locale: "en-GB",
    });
    expect(mobileLanguages).toEqual([
      { id: "en", label: "English" },
      { id: "zh-CN", label: "简体中文" },
    ]);
    expect(normalizeLanguagePreference("ar")).toBe("system");
    expect(readDeviceLocales(() => ["ar-SA", "en-GB"])).toEqual(["en-GB"]);
  });

  it.each([null, 42, {}, "", "fr", "invalid_locale"])(
    "handles invalid or unapproved preference %j",
    (value) => {
      expect(normalizeLanguagePreference(value)).toBe("system");
      expect(resolveMobileLanguage(value, ["ja-JP"])).toEqual({
        preference: "system",
        locale: "en",
      });
    },
  );

  it("picks a supported second language from the ordered device list", () => {
    const locales = readDeviceLocales(() => ["ja-JP", "zh-Hans-CN"]);
    expect(locales).toEqual(["ja-JP", "zh-Hans-CN"]);
    expect(resolveMobileLanguage(undefined, locales).locale).toBe("zh-Hans-CN");

    const hostLocale = (locale: string) =>
      vi
        .spyOn(Intl, "DateTimeFormat")
        .mockImplementation(() => ({ resolvedOptions: () => ({ locale }) }) as Intl.DateTimeFormat);

    hostLocale("en-GB");
    expect(readDeviceLocales(() => undefined)).toEqual(["en-GB"]);
    hostLocale("ar-AE");
    expect(readDeviceLocales(() => undefined)).toEqual([]);
    vi.restoreAllMocks();
  });

  it("falls back to English if device locale is unavailable", () => {
    expect(resolveMobileLanguage(undefined, [])).toEqual({ preference: "system", locale: "en" });

    const formatter = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("Intl unavailable");
    });

    try {
      expect(readDeviceLocales()).toEqual([]);
    } finally {
      formatter.mockRestore();
    }
  });

  it("interpolates interface labels without interpreting user content", () => {
    expect(translate("en", "Use {language}", { language: "English" })).toBe("Use English");
    expect(translate("en", "Version {version}", { version: "{name}" })).toBe("Version {name}");
  });
});
