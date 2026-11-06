import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(projection_bots)`;

  if (!columns.some((column) => column.name === "skills_json")) {
    yield* sql`
      ALTER TABLE projection_bots
      ADD COLUMN skills_json TEXT NOT NULL DEFAULT '[]'
    `;
  }

  if (!columns.some((column) => column.name === "skill_registry_access")) {
    yield* sql`
      ALTER TABLE projection_bots
      ADD COLUMN skill_registry_access INTEGER NOT NULL DEFAULT 0
    `;
  }
});
