import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE projection_work_items (
      work_item_id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      state TEXT NOT NULL,
      done_at TEXT,
      closed_at TEXT,
      record_json TEXT NOT NULL
    )
  `;

  yield* sql`
    CREATE INDEX idx_projection_work_items_group_state
    ON projection_work_items (group_id, state)
  `;

  yield* sql`
    CREATE INDEX idx_projection_work_items_group_done_at
    ON projection_work_items (group_id, done_at)
  `;
});
