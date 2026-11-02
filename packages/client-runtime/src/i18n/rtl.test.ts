import { describe, expect, it } from "vite-plus/test";

import {
  availableLanguages,
  catalogIdForLocale,
  createCatalogLoader,
  createTranslator,
  directionForLocale,
  englishCatalog,
  formattingLocale,
  validateCatalog,
} from "./index.ts";

// A fixture only: Arabic is not shipped yet, so the RTL catalog is injected like any test locale.
const rtlCatalog = { ...englishCatalog, Settings: "الإعدادات" };

const QUEUED = {
  one: "{count} queued message will send automatically.",
  other: "{count} queued messages will send automatically.",
};

const OTHER = QUEUED.other;

// First strong isolate and pop directional isolate, as the translator emits them.
const FSI = String.fromCodePoint(0x2068);

const PDI = String.fromCodePoint(0x2069);

describe("directionForLocale", () => {
  it.each([
    ["ar", "rtl"],
    ["ar-EG", "rtl"],
    ["fa-IR", "rtl"],
    ["he", "rtl"],
    ["iw", "rtl"],
    ["ckb", "rtl"],
    ["en", "ltr"],
    ["zh-CN", "ltr"],
    ["not a tag", "ltr"],
    ["", "ltr"],
  ])("reads %s as %s", (locale, direction) => {
    expect(directionForLocale(locale)).toBe(direction);
  });
});

describe("catalog id", () => {
  it("is derived from the listed languages and does not list Arabic yet", () => {
    expect(availableLanguages.map((language) => language.id)).toEqual(["en", "zh-CN"]);
    expect(catalogIdForLocale("en-GB")).toBe("en");
    expect(catalogIdForLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(catalogIdForLocale("ar")).toBeUndefined();
    expect(catalogIdForLocale("ar-EG")).toBeUndefined();
  });
});

describe("formattingLocale", () => {
  it("pins Arabic to Western digits and the Gregorian calendar, and leaves others alone", () => {
    expect(formattingLocale("ar")).toBe("ar-u-nu-latn-ca-gregory");
    expect(formattingLocale("ar-SA")).toBe("ar-SA-u-nu-latn-ca-gregory");
    expect(formattingLocale("ar-EG-u-nu-arab")).toBe("ar-EG-u-nu-arab");
    expect(formattingLocale("en-GB")).toBe("en-GB");
    expect(formattingLocale("zh-CN")).toBe("zh-CN");
    expect(formattingLocale("not a tag")).toBe("not a tag");
  });

  it("formats numbers with Western digits and dates in the Gregorian calendar", () => {
    const arabic = createTranslator("ar-SA", rtlCatalog);

    expect(arabic.formatNumber(1234)).toBe("1,234");

    const date = new Date(Date.UTC(2026, 10, 2, 12));
    const formatted = arabic.formatDate(date, { dateStyle: "short", timeZone: "UTC" });

    expect(formatted).toMatch(/2026|26/);
    expect(formatted).not.toMatch(/[٠-٩]/);
  });
});

describe("plural categories a catalog can add", () => {
  const catalog = {
    ...rtlCatalog,
    [`${OTHER}#zero`]: "لا رسائل ({count})",
    [`${OTHER}#one`]: "رسالة واحدة ({count})",
    [`${OTHER}#two`]: "رسالتان ({count})",
    [`${OTHER}#few`]: "{count} رسائل",
    [`${OTHER}#many`]: "{count} رسالة",
    [OTHER]: "{count} رسالة أخرى",
  };

  const pick = (translator: ReturnType<typeof createTranslator>, count: number) =>
    translator.plural(count, QUEUED).replaceAll(FSI, "").replaceAll(PDI, "");

  it("picks zero, one, two, few, many and other from the #category entries", () => {
    const translator = createTranslator("ar", catalog);

    expect(pick(translator, 0)).toBe("لا رسائل (0)");
    expect(pick(translator, 1)).toBe("رسالة واحدة (1)");
    expect(pick(translator, 2)).toBe("رسالتان (2)");
    expect(pick(translator, 3)).toBe("3 رسائل");
    expect(pick(translator, 11)).toBe("11 رسالة");
    expect(pick(translator, 100)).toBe("100 رسالة أخرى");
  });

  it("falls back to the plain translation when a category has no entry", () => {
    const withoutFew = Object.fromEntries(
      Object.entries(catalog).filter(([key]) => key !== `${OTHER}#few`),
    );

    expect(pick(createTranslator("ar", withoutFew), 3)).toBe("3 رسالة أخرى");
  });

  it("leaves English and Simplified Chinese plurals as they were", () => {
    expect(createTranslator("en").plural(1, QUEUED)).toBe(
      "1 queued message will send automatically.",
    );
    expect(createTranslator("en").plural(2, QUEUED)).toBe(
      "2 queued messages will send automatically.",
    );
  });
});

describe("catalog validation of #category entries", () => {
  it("accepts a plural entry whose base is an English message and whose parameters match", () => {
    expect(validateCatalog({ ...englishCatalog, [`${OTHER}#few`]: "{count} رسائل" })).toEqual([]);
  });

  it("reports an unknown base, a bad category and mismatched parameters", () => {
    expect(validateCatalog({ ...englishCatalog, "No such message#few": "x" })).toEqual([
      "Unknown message: No such message#few",
    ]);

    expect(validateCatalog({ ...englishCatalog, [`${OTHER}#several`]: "{count}" })).toEqual([
      `Unknown plural category: ${OTHER}#several`,
    ]);

    expect(validateCatalog({ ...englishCatalog, [`${OTHER}#few`]: "{total} رسائل" })).toEqual([
      `Parameter mismatch: ${OTHER}#few`,
    ]);
  });
});

describe("bidi isolation of parameters", () => {
  it("wraps each parameter in FSI and PDI for a right-to-left translator", () => {
    const arabic = createTranslator("ar", { ...rtlCatalog, "Hello {name}": "مرحبا {name}" });

    expect(arabic.t("Hello {name}" as never, { name: "Scout", count: 3 })).toBe(
      `مرحبا ${FSI}Scout${PDI}`,
    );

    expect(arabic.plural(2, QUEUED)).toBe(`${FSI}2${PDI} queued messages will send automatically.`);
  });

  it("adds nothing for a left-to-right translator", () => {
    const english = createTranslator("en");

    expect(english.t("Settings")).toBe("Settings");
    expect(english.translate("Hello {name}", { name: "Scout" })).toBe("Hello Scout");
    expect(english.plural(2, QUEUED)).toBe("2 queued messages will send automatically.");
    expect(createTranslator("fr", { ...englishCatalog, Settings: "Réglages" }).direction).toBe(
      "ltr",
    );
  });
});

describe("translator direction", () => {
  it("is the direction of the catalog actually in use", async () => {
    expect(createTranslator("ar", rtlCatalog).direction).toBe("rtl");
    expect(createTranslator("en").direction).toBe("ltr");

    const loader = createCatalogLoader({ ar: async () => rtlCatalog });
    await loader.selectLocale("ar-EG");
    expect(loader.getSnapshot().direction).toBe("rtl");
    expect(loader.getSnapshot().translator.direction).toBe("rtl");
  });

  it("is left-to-right while the catalog loads and when it failed to load", async () => {
    const pending = Promise.withResolvers<typeof rtlCatalog>();
    const loading = createCatalogLoader({ ar: () => pending.promise });
    const selected = loading.selectLocale("ar");

    expect(loading.getSnapshot().status).toBe("loading");
    expect(loading.getSnapshot().direction).toBe("ltr");
    pending.resolve(rtlCatalog);
    await selected;
    expect(loading.getSnapshot().direction).toBe("rtl");

    const failing = createCatalogLoader({
      ar: async () => {
        throw new Error("offline");
      },
    });

    await failing.selectLocale("ar");
    expect(failing.getSnapshot().status).toBe("error");
    expect(failing.getSnapshot().selectedLocale).toBe("ar");
    expect(failing.getSnapshot().direction).toBe("ltr");
    expect(failing.getSnapshot().translator.t("Settings")).toBe("Settings");
  });
});
