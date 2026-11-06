import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrationManifest, runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()))("079_ProjectionWorkItems", (it) => {
  it.effect("adds the work item projection with its group indexes", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 78 });

      const before = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = 'projection_work_items'
      `;

      assert.deepEqual(before, []);

      yield* runMigrations();
      assert.isTrue(
        migrationManifest.some(([id, name]) => id === 79 && name === "ProjectionWorkItems"),
      );

      const indexes = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND tbl_name = 'projection_work_items' AND name LIKE 'idx_%'
        ORDER BY name
      `;

      assert.deepEqual(
        indexes.map((row) => row.name),
        ["idx_projection_work_items_group_done_at", "idx_projection_work_items_group_state"],
      );

      yield* sql`
        INSERT INTO projection_work_items (work_item_id, group_id, state, done_at, closed_at, record_json)
        VALUES ('item-1', 'group-1', 'done', '2026-01-01T00:00:00.000Z', NULL, '{"id":"item-1"}')
      `;

      const rows = yield* sql<{ readonly workItemId: string }>`
        SELECT work_item_id AS "workItemId" FROM projection_work_items WHERE group_id = 'group-1'
      `;

      assert.deepEqual(rows, [{ workItemId: "item-1" }]);
    }),
  );
});
