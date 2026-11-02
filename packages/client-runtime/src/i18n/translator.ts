import { englishCatalog } from "./catalogs/en/index.ts";
import {
  type TranslationParams,
  type TranslationCatalog,
  type PluralForms,
  type MessageKey,
} from "./types.ts";
import { canonicalLocale, directionForLocale, resolveLocale } from "./locale.ts";
import { numberFormatter, dateFormatter, pluralRules } from "./formatters.ts";

const FIRST_STRONG_ISOLATE = "\u2068";

const POP_DIRECTIONAL_ISOLATE = "\u2069";

/**
 * Substitutes parameters. In a right-to-left translator each value is isolated (FSI … PDI), so an
 * English bot name, path or number keeps its own order inside an Arabic sentence.
 */
function interpolate(message: string, params: TranslationParams = {}, isolate = false): string {
  return message.replace(/\{(\w+)\}/g, (placeholder: string, name: string) => {
    if (!Object.hasOwn(params, name)) return placeholder;
    const value = String(params[name]);

    return isolate ? `${FIRST_STRONG_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}` : value;
  });
}

function lookup(catalog: TranslationCatalog, message: string): string {
  return Object.hasOwn(catalog, message) ? (catalog[message] ?? message) : message;
}

/** Translate interface copy only; user and provider content must bypass this function. */
export function translate(locale: string, message: string, params?: TranslationParams): string {
  // Synchronous callers stay on English until a loaded catalog is supplied through createTranslator.
  void locale;

  return interpolate(lookup(englishCatalog, message), params);
}

function renderPlural(
  locale: string,
  count: number,
  forms: PluralForms,
  params?: TranslationParams,
  catalog: TranslationCatalog = englishCatalog,
  isolate = false,
): string {
  const category = pluralRules(locale).select(count);

  // A catalog may add a form English lacks (Arabic two/few/many) as "<English other form>#<category>".
  const categoryKey = `${forms.other}#${category}`;

  const message = Object.hasOwn(catalog, categoryKey)
    ? (catalog[categoryKey] ?? forms.other)
    : lookup(catalog, forms[category] ?? forms.other);

  return interpolate(message, { ...params, count: numberFormatter(locale).format(count) }, isolate);
}

export function plural(
  locale: string,
  count: number,
  forms: PluralForms,
  params?: TranslationParams,
): string {
  return renderPlural(resolveLocale(locale), count, forms, params);
}

/** Catalog injection exercises other locales in tests without shipping additional languages. */
export function createTranslator(locale: string, testCatalog?: TranslationCatalog) {
  const resolvedLocale = testCatalog ? (canonicalLocale(locale) ?? "en") : resolveLocale(locale);

  // The direction of the catalog actually in use: a failed load builds an English translator.
  const direction = directionForLocale(resolvedLocale);
  const isolate = direction === "rtl";

  const translateMessage = (message: string, params?: TranslationParams) =>
    interpolate(
      testCatalog && Object.hasOwn(testCatalog, message)
        ? lookup(testCatalog, message)
        : lookup(englishCatalog, message),
      params,
      isolate,
    );

  const catalog = testCatalog ?? englishCatalog;

  return {
    locale: resolvedLocale,
    direction,
    t: (key: MessageKey, params?: TranslationParams) => translateMessage(key, params),
    translate: translateMessage,
    plural: (count: number, forms: PluralForms, params?: TranslationParams) =>
      renderPlural(resolvedLocale, count, forms, params, catalog, isolate),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      numberFormatter(resolvedLocale, options).format(value),
    formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) =>
      dateFormatter(resolvedLocale, options).format(value),
  };
}
