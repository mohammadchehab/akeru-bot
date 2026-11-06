import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(projection_groups)`;

  // The hop budget new chats in this group start with; NULL means the default.
  if (!columns.some((column) => column.name === "hop_budget")) {
    yield* sql`ALTER TABLE projection_groups ADD COLUMN hop_budget INTEGER`;
  }
});
