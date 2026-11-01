/**
 * Environment variables were named `AKERU_*` before the product became IsnadiBot.
 * Importing this module copies each `AKERU_<NAME>` to `ISNADI_<NAME>` when the new
 * name is unset, so existing shells, service units, and scripts keep working.
 * Entry points import it first, before any module reads the environment.
 */
export const LEGACY_PRODUCT_ENV_PREFIX = "AKERU_";

export const PRODUCT_ENV_PREFIX = "ISNADI_";

export function applyLegacyProductEnv(env: Record<string, string | undefined>): void {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith(LEGACY_PRODUCT_ENV_PREFIX) || value === undefined) continue;
    const current = `${PRODUCT_ENV_PREFIX}${name.slice(LEGACY_PRODUCT_ENV_PREFIX.length)}`;

    if (env[current] === undefined) env[current] = value;
  }
}

applyLegacyProductEnv(process.env);
