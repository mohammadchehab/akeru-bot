import * as Schema from "effect/Schema";
import * as NodeSqlite from "node:sqlite";

const decodeQueueVersion = Schema.decodeUnknownSync(Schema.Struct({ user_version: Schema.Number }));

export const OBSERVATION_QUEUE_SCHEMA_VERSION = 3;

// Versions 1 and 2 named the table after the product's earlier name.
const LEGACY_QUEUE_TABLE = "akeru_observation_queue";

// The queue lives in its own store beside the memory DB because the harness
// opens it directly; the environment state.sqlite schema is provisioned by
// the Effect migration runner, which this path never sees. The queue store
// versions itself with PRAGMA user_version instead.
export function openObservationQueueDb(memoryDbPath: string): NodeSqlite.DatabaseSync {
  const db = new NodeSqlite.DatabaseSync(`${memoryDbPath}.queue.sqlite`);

  try {
    db.exec("PRAGMA busy_timeout = 5000");

    const version = decodeQueueVersion(db.prepare("PRAGMA user_version").get()).user_version;

    if (version > OBSERVATION_QUEUE_SCHEMA_VERSION) {
      throw new Error(
        `Isnadi observation queue schema version ${version} is newer than supported version ${OBSERVATION_QUEUE_SCHEMA_VERSION}.`,
      );
    }

    if (version === 0) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS isnadi_observation_queue (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          model_id TEXT NOT NULL,
          turn_id TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          claimed_at TEXT,
          next_attempt_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          provider_instance_id TEXT
        )
      `);
      db.exec(
        "CREATE INDEX IF NOT EXISTS isnadi_observation_queue_created_at ON isnadi_observation_queue (created_at, id)",
      );
      db.exec(`PRAGMA user_version = ${OBSERVATION_QUEUE_SCHEMA_VERSION}`);
    } else if (version < OBSERVATION_QUEUE_SCHEMA_VERSION) {
      const hasLegacyTable =
        db
          .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(LEGACY_QUEUE_TABLE) !== undefined;

      if (hasLegacyTable) {
        db.exec(`DROP INDEX IF EXISTS ${LEGACY_QUEUE_TABLE}_created_at`);
        db.exec(`ALTER TABLE ${LEGACY_QUEUE_TABLE} RENAME TO isnadi_observation_queue`);
      }

      if (version === 1) {
        // Rows queued before version 2 have no instance and keep using the default connection.
        db.exec("ALTER TABLE isnadi_observation_queue ADD COLUMN provider_instance_id TEXT");
      }

      db.exec(
        "CREATE INDEX IF NOT EXISTS isnadi_observation_queue_created_at ON isnadi_observation_queue (created_at, id)",
      );
      db.exec(`PRAGMA user_version = ${OBSERVATION_QUEUE_SCHEMA_VERSION}`);
    }

    return db;
  } catch (cause) {
    db.close();
    throw cause;
  }
}
