import { canonicalLocale, resolveLocale } from "./locale.ts";

/** Arabic formats with Western digits and the Gregorian calendar; one constant decides both. */
const ARABIC_FORMATTING_EXTENSION = "-u-nu-latn-ca-gregory";

/**
 * The locale an `Intl` formatter is built with. `ar-SA` would otherwise print Hijri dates in
 * Arabic-Indic digits. An explicit `-u-` extension on the tag is kept; other locales pass through.
 */
export function formattingLocale(locale: string): string {
  const canonical = canonicalLocale(locale);

  if (!canonical || (canonical.split("-")[0] ?? canonical) !== "ar") return locale;

  return canonical.includes("-u-") ? canonical : `${canonical}${ARABIC_FORMATTING_EXTENSION}`;
}

function cachedFormatter<Options extends object, Formatter>(
  create: (locale: string, options?: Options) => Formatter,
) {
  const cache = new Map<string, Formatter>();

  return (locale: string, options?: Options): Formatter => {
    const key = JSON.stringify([locale, options ?? {}]);
    const existing = cache.get(key);

    if (existing) return existing;
    const formatter = create(locale, options);

    if (cache.size >= 32) cache.delete(cache.keys().next().value ?? "");
    cache.set(key, formatter);

    return formatter;
  };
}

export const numberFormatter = cachedFormatter(
  (locale: string, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(formattingLocale(locale), options),
);

export const dateFormatter = cachedFormatter(
  (locale: string, options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(formattingLocale(locale), options),
);

export const pluralRules = cachedFormatter(
  (locale: string, options?: Intl.PluralRulesOptions) =>
    new Intl.PluralRules(formattingLocale(locale), options),
);

export function formatNumber(
  locale: string,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return numberFormatter(resolveLocale(locale), options).format(value);
}

export function formatDate(
  locale: string,
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return dateFormatter(resolveLocale(locale), options).format(value);
}
