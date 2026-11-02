import { englishCatalog } from "./catalogs/en/index.ts";
import { type TranslationCatalog } from "./types.ts";

function parameters(message: string): string {
  return [...new Set(Array.from(message.matchAll(/\{(\w+)\}/g), (match) => match[1]))]
    .sort()
    .join(",");
}

/** Validate a complete catalog before making a language available. */
const PLURAL_CATEGORIES: ReadonlySet<string> = new Set([
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
] satisfies Intl.LDMLPluralRule[]);

/**
 * Split a `"<English other form>#<category>"` plural entry. The category is whatever follows the
 * last `#`, so an English form that itself contains `#` still resolves to the right base.
 */
function pluralEntry(key: string): { base: string; category: string } | undefined {
  const at = key.lastIndexOf("#");

  return at > 0 ? { base: key.slice(0, at), category: key.slice(at + 1) } : undefined;
}

export function validateCatalog(catalog: TranslationCatalog): string[] {
  const issues: string[] = [];

  for (const [key, source] of Object.entries(englishCatalog)) {
    if (!Object.hasOwn(catalog, key)) {
      issues.push(`Missing message: ${key}`);
    } else if (parameters(catalog[key] ?? "") !== parameters(source)) {
      issues.push(`Parameter mismatch: ${key}`);
    }
  }

  for (const key of Object.keys(catalog)) {
    if (Object.hasOwn(englishCatalog, key)) continue;
    const entry = pluralEntry(key);

    if (!entry || !Object.hasOwn(englishCatalog, entry.base)) {
      issues.push(`Unknown message: ${key}`);
    } else if (!PLURAL_CATEGORIES.has(entry.category)) {
      issues.push(`Unknown plural category: ${key}`);
    } else if (parameters(catalog[key] ?? "") !== parameters(entry.base)) {
      issues.push(`Parameter mismatch: ${key}`);
    }
  }

  return issues;
}
