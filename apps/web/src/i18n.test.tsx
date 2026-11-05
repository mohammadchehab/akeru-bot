import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import {
  applyDocumentLanguage,
  availableLanguages,
  LanguageProvider,
  normalizeLanguagePreference,
  useI18n,
} from "./i18n";

function Probe() {
  const { t, locale } = useI18n();

  return createElement("span", { lang: locale }, t("Language"), " / ", t("Close"));
}

describe("client-local language preference", () => {
  it("ships English, Simplified Chinese, and Arabic and normalizes invalid or unapproved preferences to system", () => {
    expect(availableLanguages).toEqual([
      { id: "en", label: "English" },
      { id: "zh-CN", label: "简体中文" },
      { id: "ar", label: "العربية" },
    ]);

    for (const value of [null, undefined, "", "fr", "__proto__", {}, "system"]) {
      expect(normalizeLanguagePreference(value)).toBe("system");
    }

    expect(normalizeLanguagePreference("en")).toBe("en");
    expect(normalizeLanguagePreference("zh-CN")).toBe("zh-CN");
    expect(normalizeLanguagePreference("ar")).toBe("ar");
  });

  it("injects a partial test catalog with English fallback without registering a locale", () => {
    const output = renderToStaticMarkup(
      <LanguageProvider testCatalog={{ locale: "fr", catalog: { Language: "Langue de test" } }}>
        <Probe />
      </LanguageProvider>,
    );

    expect(output).toContain('lang="fr"');
    expect(output).toContain("Langue de test / Close");
    expect(availableLanguages).toHaveLength(3);
    expect(renderToStaticMarkup(createElement(Probe))).toContain("Language / Close");
  });
});

describe("document direction", () => {
  it("sets lang and dir together on the document element", () => {
    const root = { lang: "", dir: "" };

    applyDocumentLanguage(root, { locale: "ar", direction: "rtl" });
    expect(root).toEqual({ lang: "ar", dir: "rtl" });

    applyDocumentLanguage(root, { locale: "en", direction: "ltr" });
    expect(root).toEqual({ lang: "en", dir: "ltr" });
  });

  it("exposes the direction of the injected catalog", () => {
    function DirectionProbe() {
      return createElement("span", { dir: useI18n().direction });
    }

    const output = renderToStaticMarkup(
      <LanguageProvider testCatalog={{ locale: "ar", catalog: {} }}>
        <DirectionProbe />
      </LanguageProvider>,
    );

    expect(output).toContain('dir="rtl"');
  });
});
