import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()))("079_ProjectionGroupHopBudget", (it) => {
  it.effect("adds the column once and reads NULL for an existing group", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 78 });
      yield* sql`
        INSERT INTO projection_groups (
          group_id, name, boss_bot_id, members_json, created_at, updated_at
        ) VALUES ('group-1', 'Product', 'bot-1', '[]', '2026-01-01', '2026-01-01')
      `;

      yield* runMigrations({ toMigrationInclusive: 79 });
      yield* runMigrations({ toMigrationInclusive: 79 });

      const columns = yield* sql<{ readonly name: string }>`
        PRAGMA table_info(projection_groups)
      `;
      assert.equal(columns.filter((column) => column.name === "hop_budget").length, 1);

      const rows = yield* sql<{ readonly hopBudget: number | null }>`
        SELECT hop_budget AS "hopBudget" FROM projection_groups WHERE group_id = 'group-1'
      `;
      assert.deepEqual(rows, [{ hopBudget: null }]);
    }),
  );
});
