import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import {
  WORK_ITEM_PAGE_LIMIT,
  WorkItem,
  WorkItemReadError,
  type WorkItemCountsInput,
  type WorkItemCountsResult,
  type WorkItemListInput,
  type WorkItemListResult,
} from "@isnadi/contracts";

import {
  ProjectionWorkItemRepository,
  type ProjectionWorkItemRepositoryShape,
} from "../Services/ProjectionWorkItems.ts";

const decodeWorkItem = Schema.decodeUnknownEffect(Schema.fromJsonString(WorkItem));

const CURSOR_SEPARATOR = "|";

const makeProjectionWorkItemRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const readError =
    (groupId: WorkItemListInput["groupId"]) => (cause: { readonly message: string }) =>
      new WorkItemReadError({ groupId, message: cause.message });

  /** Newest first by `doneAt` or `closedAt`; the cursor is the last row's `<timestamp>|<id>`. */
  const list = (input: WorkItemListInput) =>
    Effect.gen(function* () {
      const limit = input.limit ?? WORK_ITEM_PAGE_LIMIT;
      const column = input.state === "done" ? sql`done_at` : sql`closed_at`;

      const [cursorAt, cursorId] = (input.cursor ?? "").split(CURSOR_SEPARATOR);

      const after =
        cursorAt !== undefined && cursorId !== undefined && cursorId !== ""
          ? sql`AND (${column} < ${cursorAt} OR (${column} = ${cursorAt} AND work_item_id < ${cursorId}))`
          : sql``;

      const rows = yield* sql<{ readonly record_json: string; readonly at: string }>`
        SELECT record_json, ${column} AS at
        FROM projection_work_items
        WHERE group_id = ${input.groupId}
          AND state = ${input.state}
          ${after}
        ORDER BY ${column} DESC, work_item_id DESC
        LIMIT ${limit + 1}
      `;

      const page = rows.slice(0, limit);
      const items = yield* Effect.forEach(page, (row) => decodeWorkItem(row.record_json));
      const last = page.at(-1);
      const lastItem = items.at(-1);

      return {
        items,
        ...(rows.length > limit && last !== undefined && lastItem !== undefined
          ? { nextCursor: `${last.at}${CURSOR_SEPARATOR}${lastItem.id}` }
          : {}),
      } satisfies WorkItemListResult;
    }).pipe(Effect.mapError(readError(input.groupId)));

  /** Open and in-progress totals plus how many items finished at or after `since`. */
  const counts = (input: WorkItemCountsInput) =>
    Effect.gen(function* () {
      const [row] = yield* sql<{
        readonly open: number;
        readonly inProgress: number;
        readonly doneSince: number;
      }>`
        SELECT
          COALESCE(SUM(state NOT IN ('done', 'closed')), 0) AS open,
          COALESCE(SUM(state IN ('in-progress', 'blocked')), 0) AS inProgress,
          COALESCE(SUM(state = 'done' AND done_at >= ${input.since}), 0) AS doneSince
        FROM projection_work_items
        WHERE group_id = ${input.groupId}
      `;

      return {
        open: row?.open ?? 0,
        inProgress: row?.inProgress ?? 0,
        doneSince: row?.doneSince ?? 0,
      } satisfies WorkItemCountsResult;
    }).pipe(Effect.mapError(readError(input.groupId)));

  return { list, counts } satisfies ProjectionWorkItemRepositoryShape;
});

export const ProjectionWorkItemRepositoryLive = Layer.effect(
  ProjectionWorkItemRepository,
  makeProjectionWorkItemRepository,
);
