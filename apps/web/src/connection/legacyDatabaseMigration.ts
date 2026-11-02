import { hasTag } from "~/lib/taggedUnion";
import { ConnectionTransientError } from "@isnadi/client-runtime/connection";
import * as Effect from "effect/Effect";
import {
  CATALOG_STORE_NAME,
  catalogError,
  OBJECT_STORE_NAMES,
  readDatabaseValue,
  writeDatabaseValue,
} from "./indexedDbStorage";

// Databases used under earlier product names, newest first so its records win.
// Their stores are copied forward once.
export const LEGACY_DATABASE_NAMES = ["akeru:connection-runtime", "t3code:connection-runtime"];

// The only legacy database IsnadiBot deletes, and only after its copy succeeds. T3 Code is a
// separate product that serves the same origin (both default to port 3773), so its
// `t3code:` database is read and never modified or deleted.
export const RETIRED_DATABASE_NAMES: ReadonlyArray<string> = ["akeru:connection-runtime"];

// Written with the copied records so a legacy database that survives a blocked
// deletion is never copied again over later removals.
const LEGACY_MIGRATED_KEY = "legacy-migrated";

/** Fill missing target records from `source` and record the migration inside one transaction. */
const copyDatabaseContents = Effect.fn("web.connectionStorage.copyDatabaseContents")(function* (
  source: IDBDatabase,
  target: IDBDatabase,
) {
  const storeNames = OBJECT_STORE_NAMES.filter(
    (storeName) =>
      source.objectStoreNames.contains(storeName) && target.objectStoreNames.contains(storeName),
  );

  const entries = yield* Effect.callback<
    ReadonlyArray<readonly [string, IDBValidKey, unknown]>,
    ConnectionTransientError
  >((resume) => {
    const collected: Array<readonly [string, IDBValidKey, unknown]> = [];

    if (storeNames.length === 0) {
      resume(Effect.succeed(collected));

      return;
    }

    const transaction = source.transaction(storeNames, "readonly");
    transaction.addEventListener("error", () => {
      resume(
        Effect.fail(catalogError("migrate", transaction.error ?? "Unknown IndexedDB read error")),
      );
    });
    transaction.addEventListener("complete", () => {
      resume(Effect.succeed(collected));
    });

    for (const storeName of storeNames) {
      const request = transaction.objectStore(storeName).openCursor();
      request.addEventListener("success", () => {
        const cursor = request.result;

        if (cursor === null) return;
        collected.push([storeName, cursor.key, cursor.value] as const);
        cursor.continue();
      });
      request.addEventListener("error", () => {
        resume(
          Effect.fail(catalogError("migrate", request.error ?? "Unknown IndexedDB cursor error")),
        );
      });
    }
  });

  yield* Effect.callback<void, ConnectionTransientError>((resume) => {
    const transaction = target.transaction([...storeNames, CATALOG_STORE_NAME], "readwrite");
    transaction.addEventListener("error", () => {
      resume(
        Effect.fail(catalogError("migrate", transaction.error ?? "Unknown IndexedDB write error")),
      );
    });
    transaction.addEventListener("complete", () => {
      resume(Effect.void);
    });

    for (const [storeName, key, value] of entries) {
      const store = transaction.objectStore(storeName);
      const existing = store.getKey(key);
      existing.addEventListener("success", () => {
        if (existing.result === undefined) store.put(value, key);
      });
    }

    transaction.objectStore(CATALOG_STORE_NAME).put(true, LEGACY_MIGRATED_KEY);
  });
});

/**
 * Opens a database that already exists, at its current version, without ever creating or upgrading
 * it: a database owned by another product on this origin must not change just because we looked.
 * Resolves to null when it does not exist.
 */
const openExistingDatabase = (name: string) =>
  Effect.callback<IDBDatabase | null, ConnectionTransientError>((resume) => {
    const request = indexedDB.open(name);
    request.addEventListener("upgradeneeded", () => {
      // The database did not exist; abort so the empty one is never persisted.
      request.transaction?.abort();
    });
    request.addEventListener("error", () => {
      if (request.error?.name === "AbortError") {
        resume(Effect.succeed(null));

        return;
      }

      resume(Effect.fail(catalogError("open", request.error ?? "Unknown IndexedDB error")));
    });
    request.addEventListener("success", () => {
      resume(Effect.succeed(request.result));
    });
  });

const deleteLegacyDatabase = Effect.fn("web.connectionStorage.deleteLegacyDatabase")(function* (
  name: string,
) {
  yield* Effect.callback<void, never>((resume) => {
    const request = indexedDB.deleteDatabase(name);
    request.addEventListener("success", () => resume(Effect.void));
    request.addEventListener("error", () => resume(Effect.void));
    request.addEventListener("blocked", () => resume(Effect.void));
  });
});

/** Fill missing records from each old database. Only IsnadiBot's own earlier database is
 * retired, and only after its copy commits; T3 Code's database is left untouched. A failed
 * migration leaves the sources for retry. */
export const migrateLegacyConnectionDatabase = Effect.fn(
  "web.connectionStorage.migrateLegacyConnectionDatabase",
)(function* (database: IDBDatabase) {
  if (typeof indexedDB === "undefined") return;

  if ((yield* readDatabaseValue(database, CATALOG_STORE_NAME, LEGACY_MIGRATED_KEY)) === true)
    return;

  for (const name of LEGACY_DATABASE_NAMES) {
    const legacyResult = yield* Effect.result(openExistingDatabase(name));

    if (hasTag(legacyResult, "Failure")) {
      yield* Effect.logWarning("Could not open a legacy connection database for migration.").pipe(
        Effect.annotateLogs({ database: name, error: legacyResult.failure }),
      );

      return;
    }

    const legacyDatabase = legacyResult.success;

    if (legacyDatabase === null) continue;

    yield* Effect.scoped(
      Effect.gen(function* () {
        const legacy = yield* Effect.acquireRelease(Effect.succeed(legacyDatabase), (db) =>
          Effect.sync(() => db.close()),
        );

        yield* copyDatabaseContents(legacy, database);
      }),
    );

    if (RETIRED_DATABASE_NAMES.includes(name)) yield* deleteLegacyDatabase(name);
  }

  // Nothing is deleted for T3 Code, so the marker is what stops a later start from copying it again.
  yield* writeDatabaseValue(database, CATALOG_STORE_NAME, LEGACY_MIGRATED_KEY, true);
});
