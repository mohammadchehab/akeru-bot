import * as Effect from "effect/Effect";
import { toPersistenceSqlError } from "../../../persistence/Errors.ts";
import { type ProjectionDependencies, type ProjectorDefinition } from "./Definitions.ts";

export const WORK_ITEM_EVENT_TYPES = [
  "work-item.created",
  "work-item.assigned",
  "work-item.updated",
  "work-item.blocked",
  "work-item.unblocked",
  "work-item.closed",
  "work-item.reopened",
  "work-item.deleted",
] as const;

/** Keeps `projection_work_items` in step with `work-item.*` events. Deleted items leave no row. */
export function createWorkItems({ sql }: Pick<ProjectionDependencies, "sql">) {
  const applyWorkItemsProjection: ProjectorDefinition["apply"] = Effect.fn(
    "applyWorkItemsProjection",
  )((event, _attachmentSideEffects) => {
    if (event.type === "work-item.deleted") {
      return sql`
        DELETE FROM projection_work_items
        WHERE work_item_id = ${event.payload.workItemId}
      `.pipe(
        Effect.asVoid,
        Effect.mapError(
          toPersistenceSqlError("ProjectionPipeline.applyWorkItemsProjection:delete"),
        ),
      );
    }

    if (!event.type.startsWith("work-item.") || !("workItem" in event.payload)) {
      return Effect.void;
    }

    const item = event.payload.workItem;

    return sql`
      INSERT INTO projection_work_items (
        work_item_id, group_id, state, done_at, closed_at, record_json
      )
      VALUES (
        ${item.id},
        ${item.groupId},
        ${item.state},
        ${item.doneAt ?? null},
        ${item.closedAt ?? null},
        ${JSON.stringify(item)}
      )
      ON CONFLICT (work_item_id) DO UPDATE SET
        group_id = excluded.group_id,
        state = excluded.state,
        done_at = excluded.done_at,
        closed_at = excluded.closed_at,
        record_json = excluded.record_json
    `.pipe(
      Effect.asVoid,
      Effect.mapError(toPersistenceSqlError("ProjectionPipeline.applyWorkItemsProjection:upsert")),
    );
  });

  return { applyWorkItemsProjection };
}
