import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { GroupId, WorkItemId } from "@isnadi/contracts";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import { ProjectionWorkItemRepository } from "../Services/ProjectionWorkItems.ts";
import { ProjectionWorkItemRepositoryLive } from "./ProjectionWorkItems.ts";

const groupId = GroupId.make("group-1");

const layer = ProjectionWorkItemRepositoryLive.pipe(
  Layer.provideMerge(NodeSqliteClient.layerMemory()),
);

const seed = (
  sql: SqlClient.SqlClient,
  id: string,
  state: "queued" | "in-progress" | "blocked" | "review" | "done" | "closed",
  at?: string,
  group: string = groupId,
) => {
  const record = JSON.stringify({
    id,
    groupId: group,
    title: id,
    brief: id,
    kind: "task",
    state,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...(state === "done" && at ? { doneAt: at } : {}),
    ...(state === "closed" && at ? { closedAt: at } : {}),
  });

  return sql`
    INSERT INTO projection_work_items (work_item_id, group_id, state, done_at, closed_at, record_json)
    VALUES (
      ${id}, ${group}, ${state},
      ${state === "done" ? (at ?? null) : null},
      ${state === "closed" ? (at ?? null) : null},
      ${record}
    )
  `;
};

it.layer(layer)("ProjectionWorkItemRepository", (it) => {
  it.effect("pages finished items newest first and ties break on id", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations();
      yield* seed(sql, "a", "done", "2026-02-01T00:00:00.000Z");
      yield* seed(sql, "b", "done", "2026-02-03T00:00:00.000Z");
      yield* seed(sql, "c", "done", "2026-02-03T00:00:00.000Z");
      yield* seed(sql, "d", "done", "2026-02-02T00:00:00.000Z");
      yield* seed(sql, "x", "closed", "2026-02-09T00:00:00.000Z");
      yield* seed(sql, "o", "done", "2026-02-09T00:00:00.000Z", "other-group");

      const repository = yield* ProjectionWorkItemRepository;
      const first = yield* repository.list({ groupId, state: "done", limit: 2 });

      assert.deepEqual(
        first.items.map((item) => item.id),
        ["c", "b"].map((id) => WorkItemId.make(id)),
      );
      assert.isDefined(first.nextCursor);

      const second = yield* repository.list({
        groupId,
        state: "done",
        limit: 2,
        ...(first.nextCursor ? { cursor: first.nextCursor } : {}),
      });

      assert.deepEqual(
        second.items.map((item) => item.id),
        ["d", "a"].map((id) => WorkItemId.make(id)),
      );
      assert.isUndefined(second.nextCursor);

      const closed = yield* repository.list({ groupId, state: "closed" });

      assert.deepEqual(
        closed.items.map((item) => item.id),
        [WorkItemId.make("x")],
      );
    }),
  );

  it.effect("counts open, in-progress and done-since for one group", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations();
      yield* seed(sql, "q", "queued");
      yield* seed(sql, "p", "in-progress");
      yield* seed(sql, "bl", "blocked");
      yield* seed(sql, "r", "review");
      yield* seed(sql, "old", "done", "2026-01-05T00:00:00.000Z");
      yield* seed(sql, "new", "done", "2026-03-05T00:00:00.000Z");
      yield* seed(sql, "cl", "closed", "2026-03-06T00:00:00.000Z");
      yield* seed(sql, "oq", "queued", undefined, "other-group");

      const repository = yield* ProjectionWorkItemRepository;
      const counts = yield* repository.counts({ groupId, since: "2026-03-01T00:00:00.000Z" });

      assert.deepEqual(counts, { open: 4, inProgress: 2, doneSince: 1 });
    }),
  );
});
