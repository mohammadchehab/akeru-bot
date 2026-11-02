import * as Config from "effect/Config";
import * as Option from "effect/Option";

/**
 * Server environment variables use `ISNADI_` names. Each one still accepts its
 * older `T3CODE_` name as a fallback alias, so existing shells, service units,
 * and scripts keep working. The `ISNADI_` name wins when both are set. Older
 * Legacy variable names are copied to `ISNADI_` at startup by `@isnadi/shared/legacyEnv`.
 */
export const ISNADI_ENV_PREFIX = "ISNADI_";

export const LEGACY_ENV_PREFIX = "T3CODE_";

/**
 * `T3CODE_HOME` is T3 Code's own data directory and is never an alias for `ISNADI_HOME`:
 * falling back to it would open and migrate T3 Code's `~/.t3` database.
 */
const NEVER_ALIASED_SUFFIXES: ReadonlySet<string> = new Set(["HOME"]);

/** Reads `ISNADI_<suffix>`, falling back to `T3CODE_<suffix>` (except `HOME`). */
export function aliasedEnv<A>(
  read: (name: string) => Config.Config<A>,
  suffix: string,
): Config.Config<Option.Option<A>> {
  const primary = Config.option(read(`${ISNADI_ENV_PREFIX}${suffix}`));

  if (NEVER_ALIASED_SUFFIXES.has(suffix)) return primary;

  return Config.all([primary, Config.option(read(`${LEGACY_ENV_PREFIX}${suffix}`))]).pipe(
    Config.map(([first, legacy]) => Option.orElse(first, () => legacy)),
  );
}

/**
 * Plain `process.env` lookup with the same precedence as {@link aliasedEnv}. Unlike it, `HOME`
 * still falls back: only the service launcher reads it, from units IsnadiBot itself wrote
 * with `T3CODE_HOME` before they set `ISNADI_HOME`.
 */
export function readAliasedEnv(
  env: Readonly<Record<string, string | undefined>>,
  suffix: string,
): string | undefined {
  const primary = env[`${ISNADI_ENV_PREFIX}${suffix}`]?.trim();

  if (primary) return primary;
  const legacy = env[`${LEGACY_ENV_PREFIX}${suffix}`]?.trim();

  return legacy || undefined;
}
