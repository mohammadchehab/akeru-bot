import {
  CommandId,
  EventId,
  GroupId,
  WorkItemId,
  type OrchestrationEvent,
} from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { createEmptyReadModel, projectEvent } from "./projector.ts";

const now = "2026-01-01T00:00:00.000Z";
const groupId = GroupId.make("group-1");
const workItemId = WorkItemId.make("item-1");

const item = {
  id: workItemId,
  groupId,
  title: "Ship it",
  brief: "Ship the thing",
  kind: "task",
  state: "queued",
  createdAt: now,
  updatedAt: now,
} as const;

function makeEvent(sequence: number, type: OrchestrationEvent["type"], payload: unknown) {
  return {
    sequence,
    eventId: EventId.make(`event-${sequence}`),
    type,
    aggregateKind: "work-item",
    aggregateId: workItemId,
    occurredAt: now,
    commandId: CommandId.make(`command-${sequence}`),
    causationEventId: null,
    correlationId: null,
    metadata: {},
    payload,
    // SAFETY: the payloads below are the exact shapes the named event types carry.
  } as OrchestrationEvent;
}

it.effect("projects a work item through create, change and delete", () =>
  Effect.gen(function* () {
    const created = yield* projectEvent(
      createEmptyReadModel(now),
      makeEvent(1, "work-item.created", { workItem: item }),
    );
    expect(created.workItems).toEqual([item]);

    const assigned = yield* projectEvent(
      created,
      makeEvent(2, "work-item.updated", { workItem: { ...item, state: "in-progress" } }),
    );
    expect(assigned.workItems).toHaveLength(1);
    expect(assigned.workItems?.[0]?.state).toBe("in-progress");

    const deleted = yield* projectEvent(
      assigned,
      makeEvent(3, "work-item.deleted", { workItemId, groupId, deletedAt: now }),
    );
    expect(deleted.workItems).toEqual([]);
    expect(deleted.snapshotSequence).toBe(3);
  }),
);
