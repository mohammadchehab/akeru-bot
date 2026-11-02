import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";

import { afterEach, expect, it } from "vite-plus/test";

import {
  OBSERVATION_QUEUE_SCHEMA_VERSION,
  openObservationQueueDb,
} from "./IsnadiObservationQueueStore.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

function memoryDbPath(): string {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "isnadi-queue-store-"));
  directories.push(directory);

  return NodePath.join(directory, "memory.sqlite");
}

it("moves a version 1 queue from the legacy table name and keeps its rows", () => {
  const path = memoryDbPath();
  const legacy = new NodeSqlite.DatabaseSync(`${path}.queue.sqlite`);
  legacy.exec(`
    CREATE TABLE akeru_observation_queue (
      id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, resource_id TEXT NOT NULL,
      model_id TEXT NOT NULL, turn_id TEXT, attempts INTEGER NOT NULL DEFAULT 0,
      claimed_at TEXT, next_attempt_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX akeru_observation_queue_created_at ON akeru_observation_queue (created_at, id);
    INSERT INTO akeru_observation_queue (id, thread_id, resource_id, model_id, next_attempt_at, created_at)
    VALUES ('q-1', 't-1', 'r-1', 'm-1', '2026-11-02', '2026-11-02');
    PRAGMA user_version = 1;
  `);
  legacy.close();

  const db = openObservationQueueDb(path);

  try {
    expect(db.prepare("PRAGMA user_version").get()).toEqual({
      user_version: OBSERVATION_QUEUE_SCHEMA_VERSION,
    });
    expect(
      db.prepare("SELECT id, provider_instance_id FROM isnadi_observation_queue").all(),
    ).toEqual([{ id: "q-1", provider_instance_id: null }]);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'akeru%'").all()).toEqual([]);
  } finally {
    db.close();
  }
});

it("creates the current table in a new store", () => {
  const db = openObservationQueueDb(memoryDbPath());

  try {
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()).toEqual([
      { name: "isnadi_observation_queue" },
    ]);
  } finally {
    db.close();
  }
});
