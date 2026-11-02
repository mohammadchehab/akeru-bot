export { englishCatalog } from "./catalogs/en/index.ts";

export {
  type LanguagePreference,
  type TranslationParams,
  type TranslationCatalog,
  type PluralForms,
  type MessageKey,
} from "./types.ts";

export {
  availableLanguages,
  catalogIdForLocale,
  directionForLocale,
  firstStrongDirection,
  resolveLocale,
  type CatalogId,
  type TextDirection,
} from "./locale.ts";

export { translate, plural, createTranslator } from "./translator.ts";

export { formatNumber, formatDate, formattingLocale } from "./formatters.ts";

export { type CatalogRegistry, catalogRegistry, createCatalogLoader } from "./catalogLoader.ts";

export { validateCatalog } from "./catalogValidation.ts";

export {
  type ConnectionFailureMessageCode,
  connectionFailureMessage,
  translateConnectionStatus,
  translateConnectionStatusWithDiagnostic,
} from "./connectionStatus.ts";
