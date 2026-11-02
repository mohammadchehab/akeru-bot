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

/**
 * `T3CODE_HOME` is T3 Code's own data-directory variable, set by its service units and inherited
 * by its child processes. IsnadiBot never uses it as a data directory, so a stray one must not
 * redirect IsnadiBot into `~/.t3`. Returns the startup warning when it is set without
 * `ISNADI_HOME`, otherwise undefined.
 */
export function ignoredT3HomeWarning(
  env: Readonly<Record<string, string | undefined>>,
): string | undefined {
  if (!env.T3CODE_HOME?.trim() || env.ISNADI_HOME?.trim()) return undefined;

  return "T3CODE_HOME is set but IsnadiBot ignores it; set ISNADI_HOME to choose the data directory.";
}

applyLegacyProductEnv(process.env);
