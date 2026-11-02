import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(projection_threads)`;

  // The group responder queue as one JSON value, replaced whole by each queue event.
  if (!columns.some((column) => column.name === "responder_queue_json")) {
    yield* sql`ALTER TABLE projection_threads ADD COLUMN responder_queue_json TEXT`;
  }
});
