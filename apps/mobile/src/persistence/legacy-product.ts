import * as Effect from "effect/Effect";

import type { MobileSecureStorage } from "./mobile-secure-storage";

const CURRENT_PRODUCT_PREFIX = "isnadi";

/**
 * The product prefix used before the app became Isnadi. Persisted secure-storage
 * keys (`<prefix>.preferences`, ...) and theme ids (`<prefix>-chat`, ...) were
 * written under it, so it survives only to migrate those values forward.
 */
export const LEGACY_PRODUCT_PREFIX = "akeru";

/** Maps an `isnadi.*` storage key to the key the previous product wrote it under. */
export function legacyProductStorageKey(key: string): string {
  const currentPrefix = `${CURRENT_PRODUCT_PREFIX}.`;

  if (!key.startsWith(currentPrefix)) {
    throw new Error(`Storage key ${key} does not use the ${currentPrefix} prefix.`);
  }

  return `${LEGACY_PRODUCT_PREFIX}.${key.slice(currentPrefix.length)}`;
}

/** Maps a pre-rename theme id (`<legacy>-chat`) to its Isnadi id, or null. */
export function canonicalizeLegacyProductThemeId(themeId: string): string | null {
  const legacyPrefix = `${LEGACY_PRODUCT_PREFIX}-`;

  return themeId.startsWith(legacyPrefix)
    ? `${CURRENT_PRODUCT_PREFIX}-${themeId.slice(legacyPrefix.length)}`
    : null;
}

/**
 * Reads `key`; when it is missing, reads the first present `legacyKeys` entry,
 * copies it under `key` and deletes the legacy entry. The copy is best-effort:
 * a failed write leaves the legacy value in place for the next read.
 */
export const getItemMigratingLegacyKeys = Effect.fn("MobileStorage.getItemMigratingLegacyKeys")(
  function* (
    storage: MobileSecureStorage["Service"],
    key: string,
    legacyKeys: ReadonlyArray<string>,
  ) {
    const current = yield* storage.getItem(key);

    if (current !== null) return current;

    for (const legacyKey of legacyKeys) {
      const legacy = yield* storage.getItem(legacyKey);

      if (legacy === null) continue;
      yield* storage
        .setItem(key, legacy)
        .pipe(Effect.andThen(storage.removeItem(legacyKey)), Effect.ignore);

      return legacy;
    }

    return null;
  },
);
