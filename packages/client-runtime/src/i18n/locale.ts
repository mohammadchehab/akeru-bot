import { type LanguagePreference } from "./types.ts";

export const availableLanguages = [
  { id: "en", label: "English" },
  { id: "zh-CN", label: "简体中文" },
] as const;

export function canonicalLocale(locale: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

function isSimplifiedChinese(locale: string): boolean {
  const lower = locale.toLowerCase();

  if (lower === "zh") return true;

  if (!lower.startsWith("zh-")) return false;
  const rest = lower.slice(3);

  return (
    rest.startsWith("hans") ||
    rest === "cn" ||
    rest.startsWith("cn-") ||
    rest === "sg" ||
    rest.startsWith("sg-")
  );
}

export type CatalogId = (typeof availableLanguages)[number]["id"];

/**
 * Catalog id for a canonical locale, or undefined when the locale is unsupported. Every listed
 * language answers to its base language (`ar-EG` → `ar`); Simplified Chinese needs its script rules.
 */
export function catalogIdForLocale(locale: string): CatalogId | undefined {
  const canonical = canonicalLocale(locale);

  if (!canonical) return undefined;
  const base = canonical.split("-")[0] ?? canonical;

  if (isSimplifiedChinese(canonical)) return "zh-CN";

  return availableLanguages.find(
    (language) => language.id !== "zh-CN" && language.id.split("-")[0] === base,
  )?.id;
}

const RIGHT_TO_LEFT_LANGUAGES: ReadonlySet<string> = new Set([
  "ar",
  "fa",
  "he",
  "ur",
  "ps",
  "sd",
  "ug",
  "yi",
  "dv",
  "ckb",
]);

export type TextDirection = "ltr" | "rtl";

/**
 * Writing direction of a locale, from its base language. Not `Intl.Locale#getTextInfo`: Hermes
 * lacks it and browsers disagree. An invalid tag reads as left-to-right.
 */
export function directionForLocale(locale: string): TextDirection {
  const canonical = canonicalLocale(locale);

  if (!canonical) return "ltr";
  const base = canonical.split("-")[0] ?? canonical;

  return RIGHT_TO_LEFT_LANGUAGES.has(base) ? "rtl" : "ltr";
}

export function resolveLocale(
  preference: LanguagePreference,
  deviceLocales: readonly string[] = [],
): string {
  const candidates = preference === "system" ? deviceLocales : [preference];

  for (const candidate of candidates) {
    const locale = canonicalLocale(candidate);

    if (locale && catalogIdForLocale(locale)) return locale;
  }

  return "en";
}
