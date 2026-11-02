/**
 * One-time carry-over of renderer localStorage from the pre-rename origin.
 *
 * Chromium keys localStorage by origin. Builds released before the Isnadi
 * rename served the renderer from the legacy scheme (see
 * `ElectronProtocol.getLegacyDesktopScheme`), so everything the web app stored
 * there is invisible to the current origin. Before the main window loads we:
 *
 * 1. serve an empty HTML page on both the legacy and the current scheme,
 * 2. read every localStorage entry from a hidden window at the legacy origin,
 * 3. write the entries whose keys are missing at the current origin from a
 *    hidden window at the current origin (keys keep their old names; the web
 *    boot script renames prefixed keys afterwards),
 * 4. drop a marker file in userData so the migration never runs again.
 *
 * Every failure is logged and swallowed: startup must never fail because of
 * this migration. Without a marker the migration is retried on next launch.
 */
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as Electron from "electron";

import * as ElectronProtocol from "../electron/ElectronProtocol.ts";
import * as DesktopObservability from "./DesktopObservability.ts";

export const LEGACY_LOCAL_STORAGE_MIGRATION_MARKER_FILE = "legacy-local-storage-migrated";

// Chromium's on-disk localStorage directory inside the userData dir. When it
// does not exist there is no legacy data to read, so we skip the windows.
export const CHROMIUM_LOCAL_STORAGE_DIR = "Local Storage";

const MIGRATION_TIMEOUT = "20 seconds";

const MIGRATION_PAGE_PATH = "/legacy-storage-migration";

const MIGRATION_PAGE_HTML = "<!doctype html><html><head><title></title></head><body></body></html>";

const MigrationStage = Schema.Literals([
  "check-marker",
  "check-local-storage",
  "register-protocol",
  "open-window",
  "load-page",
  "read-entries",
  "decode-entries",
  "write-entries",
  "flush-storage",
  "write-marker",
]);

export type MigrationStage = typeof MigrationStage.Type;

export class LegacyLocalStorageMigrationError extends Schema.TaggedErrorClass<LegacyLocalStorageMigrationError>()(
  "LegacyLocalStorageMigrationError",
  {
    stage: MigrationStage,
    origin: Schema.NullOr(Schema.String),
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    const origin = this.origin === null ? "" : ` (${this.origin})`;

    return `Legacy localStorage migration failed at stage "${this.stage}"${origin}.`;
  }
}

export const LocalStorageEntries = Schema.Array(Schema.Tuple([Schema.String, Schema.String]));

export type LocalStorageEntries = typeof LocalStorageEntries.Type;

export const LocalStorageKeys = Schema.Array(Schema.String);

export const READ_LOCAL_STORAGE_ENTRIES_SCRIPT = `(() => {
  const entries = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key === null) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries.push([key, value]);
  }
  return entries;
})()`;

export const READ_LOCAL_STORAGE_KEYS_SCRIPT = `(() => {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== null) keys.push(key);
  }
  return keys;
})()`;

/** Entries from the legacy origin whose keys do not yet exist at the new origin. */
export function selectMissingEntries(
  legacyEntries: LocalStorageEntries,
  existingKeys: ReadonlyArray<string>,
): LocalStorageEntries {
  const existing = new Set(existingKeys);

  return legacyEntries.filter(([key]) => !existing.has(key));
}

/**
 * Builds a script that writes the given entries, again skipping keys that
 * already exist so a concurrent write at the new origin is never clobbered.
 * Returns the number of entries written.
 */
export function makeWriteLocalStorageEntriesScript(entries: LocalStorageEntries): string {
  return `((entries) => {
  let written = 0;
  for (const [key, value] of entries) {
    if (localStorage.getItem(key) !== null) continue;
    localStorage.setItem(key, value);
    written += 1;
  }
  return written;
})(${JSON.stringify(entries)})`;
}

export function makeMigrationPageResponse(request: Request): Response {
  const url = new URL(request.url);

  if (url.host !== ElectronProtocol.DESKTOP_HOST) {
    return new Response(null, { status: 404 });
  }

  return new Response(MIGRATION_PAGE_HTML, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function getMigrationPageUrl(scheme: string): string {
  return `${scheme}://${ElectronProtocol.DESKTOP_HOST}${MIGRATION_PAGE_PATH}`;
}

const { logInfo, logWarning } = DesktopObservability.componentLogger(
  "desktop-legacy-storage-migration",
);

const serveMigrationPage = (scheme: string) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => Electron.protocol.handle(scheme, makeMigrationPageResponse),
      catch: (cause) =>
        new LegacyLocalStorageMigrationError({ stage: "register-protocol", origin: scheme, cause }),
    }),
    () =>
      Effect.sync(() => {
        try {
          Electron.protocol.unhandle(scheme);
        } catch {
          // Best effort: the real handler is registered later and would fail
          // loudly on its own if this one were still installed.
        }
      }),
  );

const openHiddenWindowAt = (scheme: string) =>
  Effect.gen(function* () {
    const url = getMigrationPageUrl(scheme);

    const window = yield* Effect.acquireRelease(
      Effect.try({
        try: () =>
          new Electron.BrowserWindow({
            show: false,
            width: 100,
            height: 100,
            webPreferences: {
              // Same (default) session as the main window, so the storage we
              // read and write is the storage the renderer will see.
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
            },
          }),
        catch: (cause) =>
          new LegacyLocalStorageMigrationError({ stage: "open-window", origin: url, cause }),
      }),
      (window) =>
        Effect.sync(() => {
          if (!window.isDestroyed()) window.destroy();
        }),
    );

    yield* Effect.tryPromise({
      try: () => window.loadURL(url),
      catch: (cause) =>
        new LegacyLocalStorageMigrationError({ stage: "load-page", origin: url, cause }),
    });

    // Runs `script` in the page and parses its result at this boundary.
    const execute = <A>(
      stage: MigrationStage,
      script: string,
      schema: Schema.Codec<A, unknown>,
    ): Effect.Effect<A, LegacyLocalStorageMigrationError> =>
      Effect.tryPromise({
        try: () => window.webContents.executeJavaScript(script),
        catch: (cause) => new LegacyLocalStorageMigrationError({ stage, origin: url, cause }),
      }).pipe(
        Effect.flatMap((raw) =>
          Schema.decodeUnknownEffect(schema)(raw).pipe(
            Effect.mapError(
              (cause) =>
                new LegacyLocalStorageMigrationError({
                  stage: "decode-entries",
                  origin: url,
                  cause,
                }),
            ),
          ),
        ),
      );

    return { url, execute } as const;
  });

const migrateEntries = Effect.fn("desktop.legacyStorageMigration.migrateEntries")(function* (
  isDevelopment: boolean,
) {
  const legacyScheme = ElectronProtocol.getLegacyDesktopScheme(isDevelopment);
  const currentScheme = ElectronProtocol.getDesktopScheme(isDevelopment);

  yield* serveMigrationPage(legacyScheme);
  yield* serveMigrationPage(currentScheme);

  const legacyEntries = yield* Effect.scoped(
    Effect.gen(function* () {
      const legacyWindow = yield* openHiddenWindowAt(legacyScheme);

      return yield* legacyWindow.execute(
        "read-entries",
        READ_LOCAL_STORAGE_ENTRIES_SCRIPT,
        LocalStorageEntries,
      );
    }),
  );

  if (legacyEntries.length === 0) {
    return { legacyEntries: 0, written: 0 } as const;
  }

  const written = yield* Effect.scoped(
    Effect.gen(function* () {
      const currentWindow = yield* openHiddenWindowAt(currentScheme);

      const existingKeys = yield* currentWindow.execute(
        "read-entries",
        READ_LOCAL_STORAGE_KEYS_SCRIPT,
        LocalStorageKeys,
      );

      const missing = selectMissingEntries(legacyEntries, existingKeys);

      if (missing.length === 0) return 0;

      return yield* currentWindow.execute(
        "write-entries",
        makeWriteLocalStorageEntriesScript(missing),
        Schema.Number,
      );
    }),
  );

  yield* Effect.try({
    try: () => Electron.session.defaultSession.flushStorageData(),
    catch: (cause) =>
      new LegacyLocalStorageMigrationError({ stage: "flush-storage", origin: null, cause }),
  });

  return { legacyEntries: legacyEntries.length, written } as const;
}, Effect.scoped);

/**
 * Pure filesystem pre-check: decides whether the Electron part of the
 * migration needs to run, and returns the marker path to write afterwards.
 */
export const resolveLegacyLocalStorageMigrationPlan = Effect.fn(
  "desktop.legacyStorageMigration.resolvePlan",
)(function* (userDataPath: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const markerPath = path.join(userDataPath, LEGACY_LOCAL_STORAGE_MIGRATION_MARKER_FILE);

  const alreadyMigrated = yield* fileSystem
    .exists(markerPath)
    .pipe(
      Effect.mapError(
        (cause) =>
          new LegacyLocalStorageMigrationError({ stage: "check-marker", origin: null, cause }),
      ),
    );

  if (alreadyMigrated) return { state: "already-migrated", markerPath } as const;

  const hasLocalStorage = yield* fileSystem
    .exists(path.join(userDataPath, CHROMIUM_LOCAL_STORAGE_DIR))
    .pipe(
      Effect.mapError(
        (cause) =>
          new LegacyLocalStorageMigrationError({
            stage: "check-local-storage",
            origin: null,
            cause,
          }),
      ),
    );

  return hasLocalStorage
    ? ({ state: "migrate", markerPath } as const)
    : ({ state: "nothing-to-migrate", markerPath } as const);
});

export const LegacyLocalStorageMigrationMarker = Schema.Struct({
  migratedAt: Schema.String,
  legacyEntries: Schema.Number,
  written: Schema.Number,
});

const encodeMarker = Schema.encodeEffect(Schema.fromJsonString(LegacyLocalStorageMigrationMarker));

export const writeLegacyLocalStorageMigrationMarker = Effect.fn(
  "desktop.legacyStorageMigration.writeMarker",
)(function* (
  markerPath: string,
  result: { readonly legacyEntries: number; readonly written: number },
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const migratedAt = DateTime.formatIso(yield* DateTime.now);

  yield* encodeMarker({ migratedAt, ...result }).pipe(
    Effect.flatMap((contents) => fileSystem.writeFileString(markerPath, `${contents}\n`)),
    Effect.mapError(
      (cause) =>
        new LegacyLocalStorageMigrationError({ stage: "write-marker", origin: null, cause }),
    ),
  );
});

/**
 * Must run after `app.whenReady()`, after `userData` is set and the
 * single-instance lock is held, and before the renderer protocol is registered
 * and the main window is created.
 */
export const migrateLegacyLocalStorage = Effect.fn("desktop.legacyStorageMigration.run")(
  function* (input: { readonly userDataPath: string; readonly isDevelopment: boolean }) {
    const plan = yield* resolveLegacyLocalStorageMigrationPlan(input.userDataPath);

    if (plan.state === "already-migrated") return;

    if (plan.state === "nothing-to-migrate") {
      yield* writeLegacyLocalStorageMigrationMarker(plan.markerPath, {
        legacyEntries: 0,
        written: 0,
      });

      return;
    }

    const result = yield* migrateEntries(input.isDevelopment).pipe(
      Effect.timeout(MIGRATION_TIMEOUT),
    );

    yield* writeLegacyLocalStorageMigrationMarker(plan.markerPath, result);
    yield* logInfo("migrated legacy renderer localStorage", result);
  },
  (effect) =>
    effect.pipe(
      Effect.catch((error) =>
        logWarning("legacy renderer localStorage migration failed; continuing startup", {
          error: error.message,
        }),
      ),
      Effect.catchDefect((defect) =>
        logWarning("legacy renderer localStorage migration crashed; continuing startup", {
          error: String(defect),
        }),
      ),
    ),
);
