import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import {
  LEGACY_TABLE_PREFIX,
  renameProductSchemaObjects,
  TABLE_PREFIX,
} from "./074_RenameLegacyProductTables.ts";

const schemaNames = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const rows = yield* sql<{ readonly name: string }>`
    SELECT name FROM sqlite_master WHERE name LIKE '%memory%' OR name LIKE '%bot_usage%'
  `;

  return rows.map((row) => row.name);
});

it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()))("074_RenameLegacyProductTables", (it) => {
  it.effect("moves legacy tables, indexes, triggers, and rows to the current prefix", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 73 });
      // Recreate the shape a database migrated before the rename has.
      yield* renameProductSchemaObjects(TABLE_PREFIX, LEGACY_TABLE_PREFIX);
      assert.isTrue((yield* schemaNames).every((name) => !name.includes(TABLE_PREFIX)));

      yield* sql.unsafe(`
        INSERT INTO ${LEGACY_TABLE_PREFIX}bot_usage_balances (bot_id, consumed_tokens, reserved_tokens, updated_at)
        VALUES ('bot-1', 5, 0, '2026-11-02')
      `);

      yield* runMigrations({ toMigrationInclusive: 74 });

      const names = yield* schemaNames;
      assert.isTrue(names.every((name) => !name.includes(LEGACY_TABLE_PREFIX)));
      assert.include(names, "isnadi_memory_fts_insert");
      assert.include(names, "idx_isnadi_memory_one_current_revision");

      const balances = yield* sql<{ readonly consumed_tokens: number }>`
        SELECT consumed_tokens FROM isnadi_bot_usage_balances WHERE bot_id = 'bot-1'
      `;

      assert.deepEqual(
        balances.map((row) => row.consumed_tokens),
        [5],
      );
    }),
  );
});
