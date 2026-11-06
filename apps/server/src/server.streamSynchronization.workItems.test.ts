import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  EventId,
  GroupId,
  ORCHESTRATION_WS_METHODS,
  type OrchestrationEvent,
  WorkItemId,
  type WorkItem,
  toWorkItemSummary,
} from "@isnadi/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

import { buildAppUnderTest } from "./serverTestApp.ts";
import { getWsServerUrl, withWsRpcClient } from "./serverTestClients.ts";

const now = "2026-01-01T00:00:00.000Z";

const workItemId = WorkItemId.make("work-item-1");

const closedId = WorkItemId.make("work-item-2");

const deletedId = WorkItemId.make("work-item-3");

const openItem: WorkItem = {
  id: workItemId,
  groupId: GroupId.make("group-1"),
  title: "Ship it",
  brief: "long brief ".repeat(800),
  kind: "task",
  state: "queued",
  createdAt: now,
  updatedAt: now,
};

const doneItem: WorkItem = { ...openItem, id: closedId, state: "done", doneAt: now };

const envelope = (sequence: number, aggregateId: WorkItemId) => ({
  sequence,
  eventId: EventId.make(`event-work-item-${sequence}`),
  aggregateKind: "work-item" as const,
  aggregateId,
  occurredAt: now,
  commandId: null,
  causationEventId: null,
  correlationId: null,
  metadata: {},
});

it.layer(NodeServices.layer)("shell stream work items", (it) => {
  it.effect("upserts open items and removes items that are done or deleted", () =>
    Effect.gen(function* () {
      const events = [
        {
          ...envelope(1, workItemId),
          type: "work-item.created",
          payload: { workItem: openItem },
        } satisfies Extract<OrchestrationEvent, { type: "work-item.created" }>,
        {
          ...envelope(2, closedId),
          type: "work-item.closed",
          payload: { workItem: doneItem },
        } satisfies Extract<OrchestrationEvent, { type: "work-item.closed" }>,
        {
          ...envelope(3, deletedId),
          type: "work-item.deleted",
          payload: { workItemId: deletedId, groupId: openItem.groupId, deletedAt: now },
        } satisfies Extract<OrchestrationEvent, { type: "work-item.deleted" }>,
      ];

      yield* buildAppUnderTest({
        layers: {
          orchestrationEngine: {
            latestSequence: Effect.succeed(3),
            readEvents: () => Stream.fromIterable(events),
          },
        },
      });

      const wsUrl = yield* getWsServerUrl("/ws");

      const items = yield* Effect.scoped(
        withWsRpcClient(wsUrl, (client) =>
          client[ORCHESTRATION_WS_METHODS.subscribeShell]({ afterSequence: 0 }).pipe(
            Stream.take(3),
            Stream.runCollect,
          ),
        ),
      );

      assert.deepEqual(Array.from(items), [
        { kind: "work-item-upserted", sequence: 1, workItem: toWorkItemSummary(openItem) },
        { kind: "work-item-removed", sequence: 2, workItemId: closedId },
        { kind: "work-item-removed", sequence: 3, workItemId: deletedId },
      ]);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );
});
