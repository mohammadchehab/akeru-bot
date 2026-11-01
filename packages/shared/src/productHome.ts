import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { PRODUCT_HOME_DIRNAME } from "./devHome.ts";

/** The data directory name this product used before it was renamed to IsnadiBot. */
export const LEGACY_PRODUCT_HOME_DIRNAME = ".akeru";

/**
 * The default data directory under `homeDirectory`. Moves an existing `~/.akeru`
 * to `~/.isnadi` once, then leaves `~/.akeru` as a link to it so an older app,
 * CLI, or service unit that still uses the old path keeps finding its data.
 * If the move fails, the legacy directory keeps being used in place.
 */
export const resolveProductHomeDir = Effect.fn("productHome.resolve")(function* (
  homeDirectory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const current = path.join(homeDirectory, PRODUCT_HOME_DIRNAME);
  const legacy = path.join(homeDirectory, LEGACY_PRODUCT_HOME_DIRNAME);

  const exists = (target: string) =>
    fileSystem.exists(target).pipe(Effect.orElseSucceed(() => false));

  if (yield* exists(current)) return current;

  // A link at the legacy path is the one this function leaves behind; never move it.
  const legacyIsLink = yield* fileSystem.readLink(legacy).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false),
  );

  const legacyIsDirectory = yield* fileSystem.stat(legacy).pipe(
    Effect.map((info) => info.type === "Directory"),
    Effect.orElseSucceed(() => false),
  );

  if (legacyIsLink || !legacyIsDirectory) return current;

  const moved = yield* fileSystem.rename(legacy, current).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false),
  );

  if (!moved) return legacy;

  // The data already moved; a missing compatibility link only affects old tools.
  yield* fileSystem.symlink(current, legacy).pipe(Effect.ignore);

  return current;
});

/**
 * Read-only counterpart of {@link resolveProductHomeDir} for synchronous startup
 * code and scripts: finds the data directory without moving it.
 */
export function findProductHomeDir(input: {
  readonly homeDirectory: string;
  readonly joinPath: (first: string, ...segments: string[]) => string;
  readonly exists: (path: string) => boolean;
}): string {
  const current = input.joinPath(input.homeDirectory, PRODUCT_HOME_DIRNAME);
  const legacy = input.joinPath(input.homeDirectory, LEGACY_PRODUCT_HOME_DIRNAME);

  return !input.exists(current) && input.exists(legacy) ? legacy : current;
}
