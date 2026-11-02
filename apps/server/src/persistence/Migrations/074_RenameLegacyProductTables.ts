import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

// The product was called Akeru when migrations 054-068 first ran, so existing
// databases hold these tables, their indexes, and their triggers under that prefix.
export const LEGACY_TABLE_PREFIX = "akeru_";

export const TABLE_PREFIX = "isnadi_";

const PRODUCT_TABLES = [
  "memory_revisions",
  "memory_derived_copies",
  "memory_fts",
  "memory_candidates",
  "memory_decision_receipts",
  "bot_usage_balances",
  "bot_usage_entries",
] as const;

interface SchemaObject {
  readonly type: string;
  readonly name: string;
  readonly sql: string | null;
}

/**
 * Renames the product tables from one prefix to another, then recreates their
 * indexes and triggers under the new prefix. SQLite rewrites the table references
 * inside those definitions on rename but keeps the object names, so only the
 * names still carry the old prefix. Tables that do not exist are skipped.
 */
export const renameProductSchemaObjects = (from: string, to: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    for (const table of PRODUCT_TABLES) {
      const existing = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${from + table}
      `;

      if (existing.length === 0) continue;
      yield* sql.unsafe(`ALTER TABLE "${from + table}" RENAME TO "${to + table}"`);
    }

    const objects = yield* sql<SchemaObject>`
      SELECT type, name, sql FROM sqlite_master
      WHERE type IN ('index', 'trigger') AND sql IS NOT NULL
        AND (name LIKE ${from + "%"} OR name LIKE ${"idx_" + from + "%"})
    `;

    for (const object of objects) {
      yield* sql.unsafe(`DROP ${object.type.toUpperCase()} "${object.name}"`);
      yield* sql.unsafe(object.sql!.replaceAll(from, to));
    }
  });

export default renameProductSchemaObjects(LEGACY_TABLE_PREFIX, TABLE_PREFIX);
