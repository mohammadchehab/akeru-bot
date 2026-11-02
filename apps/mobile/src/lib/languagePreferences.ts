import { flow, Option, Predicate, Schema } from "effect";
import { availableLanguages, directionForLocale, resolveLocale } from "@isnadi/client-runtime/i18n";

/**
 * Languages mobile offers. Right-to-left languages stay out until mobile restarts into the new
 * layout direction, so neither the selector nor a device locale can reach one.
 */
export const mobileLanguages = availableLanguages.filter(
  (language) => directionForLocale(language.id) === "ltr",
);

export const normalizeLanguagePreference = flow(
  Schema.decodeUnknownOption(Schema.String),
  Option.getOrNull,
  (value) =>
    value !== null && mobileLanguages.some((language) => language.id === value) ? value : "system",
);

// Normalization is the preference I/O boundary; locale selection consumes its typed output.
export function resolveMobileLanguage(
  value: Parameters<typeof normalizeLanguagePreference>[0],
  deviceLocales: readonly string[],
) {
  const preference = normalizeLanguagePreference(value);

  return { preference, locale: resolveLocale(preference, deviceLocales) };
}

const leftToRight = (locales: readonly string[]) =>
  locales.filter((locale) => directionForLocale(locale) === "ltr");

/**
 * Device locales in preference order. Uses the platform's ordered list when the caller can
 * read one, so a supported second language wins over an unsupported first one; otherwise
 * falls back to the single resolved Intl locale. Right-to-left locales are dropped, see
 * `mobileLanguages`.
 */
export function readDeviceLocales(
  readPreferredLocales?: () => readonly string[] | undefined,
): readonly string[] {
  try {
    const preferred = readPreferredLocales?.();

    if (
      Array.isArray(preferred) &&
      preferred.length > 0 &&
      preferred.every((locale) => Predicate.isString(locale))
    ) {
      return leftToRight(preferred);
    }
  } catch {
    // Fall through to the resolved locale.
  }

  try {
    return leftToRight([Intl.DateTimeFormat().resolvedOptions().locale]);
  } catch {
    return [];
  }
}
