import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(projection_turns)`;

  // What started the turn (a user message or a bot mention), as one JSON value.
  if (!columns.some((column) => column.name === "trigger_json")) {
    yield* sql`ALTER TABLE projection_turns ADD COLUMN trigger_json TEXT`;
  }
});
