import { describe, expect, it } from "vite-plus/test";

import { arCatalog } from "./ar.ts";
import { createTranslator, englishCatalog, validateCatalog } from "./index.ts";

const CATEGORIES = ["zero", "two", "few", "many"] as const;

const arabicIndicDigits = /[٠-٩۰-۹]/;

// The runtime adds isolates and direction marks around parameters; catalog text carries none.
const directionMarks = /[‎‏‪-‮⁦-⁩]/;

describe("Arabic catalog", () => {
  it("is a complete catalog", () => {
    expect(validateCatalog(arCatalog)).toEqual([]);
  });

  it("translates the messages instead of repeating English", () => {
    const kept = Object.entries(englishCatalog).filter(([key, value]) => arCatalog[key] === value);

    // Names, acronyms and code tokens stay as they are; prose does not.
    const prose = kept.filter(([key]) => /[a-z]{3,}\s+[a-z]{3,}/i.test(key));

    expect(prose.map(([key]) => key)).toEqual([]);
  });

  it("uses Western digits and no direction marks", () => {
    const values = Object.values(arCatalog);

    expect(values.filter((value) => arabicIndicDigits.test(value))).toEqual([]);
    expect(values.filter((value) => directionMarks.test(value))).toEqual([]);
  });

  it("gives every plural message all six categories", () => {
    const bases = new Set(
      Object.keys(arCatalog).flatMap((key) =>
        key.includes("#") ? [key.slice(0, key.lastIndexOf("#"))] : [],
      ),
    );

    expect(bases.size).toBeGreaterThan(0);

    for (const base of bases) {
      for (const category of CATEGORIES) {
        expect(Object.hasOwn(arCatalog, `${base}#${category}`), `${base}#${category}`).toBe(true);
      }
    }
  });

  it("picks the Arabic form for each count", () => {
    const translator = createTranslator("ar", arCatalog);

    const forms = { one: "{count} bot", other: "{count} bots" };

    const rendered = [0, 1, 2, 5, 11, 100].map((count) => translator.plural(count, forms));

    expect(new Set(rendered).size).toBe(rendered.length);
  });
});
