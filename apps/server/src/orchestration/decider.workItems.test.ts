import {
  AuthSessionId,
  CommandId,
  WorkItemId,
  type OrchestrationCommand,
  type OrchestrationEvent,
  type WorkItem,
} from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { decideOrchestrationCommand } from "./decider.ts";
import {
  makeReadModel,
  makeBot,
  makeGroup,
  BOSS_ID,
  SPECIALIST_ID,
  OTHER_SPECIALIST_ID,
  PERSON_ID,
  GROUP_ID,
  NOW,
} from "./test-support/GroupDeciderFixtures.ts";

const ITEM_ID = WorkItemId.make("item-1");

const makeItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: ITEM_ID,
  groupId: GROUP_ID,
  title: "Fix the thing",
  brief: "It is broken.",
  kind: "task",
  state: "queued",
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeModel = (items: ReadonlyArray<WorkItem>) => ({
  ...makeReadModel({
    bots: [
      makeBot({ id: BOSS_ID, groupId: GROUP_ID }),
      makeBot({ id: SPECIALIST_ID, groupId: GROUP_ID }),
      makeBot({ id: OTHER_SPECIALIST_ID }),
    ],
    groups: [makeGroup()],
  }),
  workItems: items,
});

const cmd = (command: OrchestrationCommand) => command;

const decide = Effect.fn("decide")(function* (
  command: OrchestrationCommand,
  items: ReadonlyArray<WorkItem>,
  actor?: { readonly personId: AuthSessionId; readonly canManageGroups: boolean },
) {
  const result = yield* decideOrchestrationCommand({
    command,
    readModel: makeModel(items),
    ...(actor !== undefined ? { actor } : {}),
  });

  return Array.isArray(result) ? result : [result];
});

const changed = (events: ReadonlyArray<OrchestrationEvent>): WorkItem => {
  const payload = events[0]?.payload;

  if (payload === undefined || !("workItem" in payload)) throw new Error("no work item payload");

  return payload.workItem;
};

const fails = <E, R>(effect: Effect.Effect<unknown, E, R>) =>
  Effect.map(Effect.exit(effect), (exit) => expect(Exit.isFailure(exit)).toBe(true));

it.layer(NodeServices.layer)("work item decider", (it) => {
  it.effect("creates a queued item with the group aggregate", () =>
    Effect.gen(function* () {
      const events = yield* decide(
        cmd({
          type: "work-item.create",
          commandId: CommandId.make("cmd-work-item.create"),
          workItemId: ITEM_ID,
          groupId: GROUP_ID,
          title: "Fix the thing",
          brief: "It is broken.",
          kind: "bug",
          actorBotId: BOSS_ID,
        }),
        [],
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("work-item.created");
      expect(events[0]?.aggregateKind).toBe("work-item");
      expect(events[0]?.aggregateId).toBe(ITEM_ID);
      expect(changed(events)).toMatchObject({ state: "queued", kind: "bug", groupId: GROUP_ID });
    }),
  );

  it.effect("rejects a new item once the space has 200 open items", () =>
    Effect.gen(function* () {
      const open = Array.from({ length: 200 }, (_, index) =>
        makeItem({ id: WorkItemId.make(`open-${index}`) }),
      );

      const done = makeItem({ id: WorkItemId.make("done-1"), state: "done", doneAt: NOW });

      const exit = yield* Effect.exit(
        decide(
          cmd({
            type: "work-item.create",
            commandId: CommandId.make("cmd-work-item.create"),
            workItemId: ITEM_ID,
            groupId: GROUP_ID,
            title: "One more",
            brief: "Too many.",
            kind: "task",
          }),
          [...open, done],
        ),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      expect(JSON.stringify(exit)).toContain("This space has 200 open items. Close some first.");
    }),
  );

  it.effect("assigns to a member and records the assigning bot", () =>
    Effect.gen(function* () {
      const events = yield* decide(
        cmd({
          type: "work-item.assign",
          commandId: CommandId.make("cmd-work-item.assign"),
          workItemId: ITEM_ID,
          ownerBotId: SPECIALIST_ID,
          actorBotId: BOSS_ID,
        }),
        [makeItem()],
      );

      expect(events[0]?.type).toBe("work-item.assigned");
      expect(changed(events)).toMatchObject({
        state: "assigned",
        ownerBotId: SPECIALIST_ID,
        assignedByBotId: BOSS_ID,
      });
    }),
  );

  it.effect("leaves assignedByBotId empty when a user assigns", () =>
    Effect.gen(function* () {
      const events = yield* decide(
        cmd({
          type: "work-item.assign",
          commandId: CommandId.make("cmd-work-item.assign"),
          workItemId: ITEM_ID,
          ownerBotId: SPECIALIST_ID,
        }),
        [makeItem()],
        { personId: PERSON_ID, canManageGroups: false },
      );

      expect(changed(events).assignedByBotId).toBeUndefined();
    }),
  );

  it.effect("returns an item to queued when the owner is cleared", () =>
    Effect.gen(function* () {
      const events = yield* decide(
        cmd({
          type: "work-item.assign",
          commandId: CommandId.make("cmd-work-item.assign"),
          workItemId: ITEM_ID,
          ownerBotId: null,
          actorBotId: BOSS_ID,
        }),
        [makeItem({ state: "assigned", ownerBotId: SPECIALIST_ID })],
      );

      expect(changed(events)).toMatchObject({ state: "queued" });
      expect(changed(events).ownerBotId).toBeUndefined();
    }),
  );

  it.effect("rejects an owner outside the group", () =>
    fails(
      decide(
        cmd({
          type: "work-item.assign",
          commandId: CommandId.make("cmd-work-item.assign"),
          workItemId: ITEM_ID,
          ownerBotId: OTHER_SPECIALIST_ID,
          actorBotId: BOSS_ID,
        }),
        [makeItem()],
      ),
    ),
  );

  it.effect("moves to in-progress only from assigned, in-progress, review or blocked", () =>
    Effect.gen(function* () {
      const update = cmd({
        type: "work-item.update",
        commandId: CommandId.make("cmd-work-item.update"),
        workItemId: ITEM_ID,
        state: "in-progress",
        actorBotId: SPECIALIST_ID,
      });

      const events = yield* decide(update, [
        makeItem({ state: "assigned", ownerBotId: SPECIALIST_ID }),
      ]);

      expect(changed(events).state).toBe("in-progress");

      yield* fails(decide(update, [makeItem({ state: "queued", ownerBotId: SPECIALIST_ID })]));
      yield* fails(
        decide(update, [makeItem({ state: "done", ownerBotId: SPECIALIST_ID, doneAt: NOW })]),
      );
    }),
  );

  it.effect("unblocks to the state the item was blocked from", () =>
    Effect.gen(function* () {
      const blocked = yield* decide(
        cmd({
          type: "work-item.block",
          commandId: CommandId.make("cmd-work-item.block"),
          workItemId: ITEM_ID,
          blockedOn: { by: "user", note: "Need the API key" },
          actorBotId: SPECIALIST_ID,
        }),
        [makeItem({ state: "in-progress", ownerBotId: SPECIALIST_ID })],
      );

      expect(changed(blocked)).toMatchObject({
        state: "blocked",
        blockedFrom: "in-progress",
        blockedOn: { by: "user", note: "Need the API key" },
      });

      const unblocked = yield* decide(
        cmd({
          type: "work-item.unblock",
          commandId: CommandId.make("cmd-work-item.unblock"),
          workItemId: ITEM_ID,
          actorBotId: SPECIALIST_ID,
        }),
        [changed(blocked)],
      );

      expect(changed(unblocked).state).toBe("in-progress");
      expect(changed(unblocked).blockedOn).toBeUndefined();
      expect(changed(unblocked).blockedFrom).toBeUndefined();
    }),
  );

  it.effect("closes as done or dropped and reopens by owner", () =>
    Effect.gen(function* () {
      const owned = makeItem({ state: "review", ownerBotId: SPECIALIST_ID });

      const done = yield* decide(
        cmd({
          type: "work-item.close",
          commandId: CommandId.make("cmd-work-item.close"),
          workItemId: ITEM_ID,
          resolution: "done",
          actorBotId: BOSS_ID,
        }),
        [owned],
      );

      expect(events0(done)).toBe("work-item.closed");
      expect(changed(done).state).toBe("done");
      expect(changed(done).doneAt).toBeDefined();

      const dropped = yield* decide(
        cmd({
          type: "work-item.close",
          commandId: CommandId.make("cmd-work-item.close"),
          workItemId: ITEM_ID,
          resolution: "dropped",
          actorBotId: BOSS_ID,
        }),
        [owned],
      );

      expect(changed(dropped).state).toBe("closed");
      expect(changed(dropped).closedAt).toBeDefined();

      const reopened = yield* decide(
        cmd({
          type: "work-item.reopen",
          commandId: CommandId.make("cmd-work-item.reopen"),
          workItemId: ITEM_ID,
          actorBotId: BOSS_ID,
        }),
        [changed(done)],
      );

      expect(changed(reopened).state).toBe("assigned");
      expect(changed(reopened).doneAt).toBeUndefined();

      const reopenedUnowned = yield* decide(
        cmd({
          type: "work-item.reopen",
          commandId: CommandId.make("cmd-work-item.reopen"),
          workItemId: ITEM_ID,
          actorBotId: BOSS_ID,
        }),
        [changed(dropped)].map((item) => {
          const { ownerBotId: _owner, ...rest } = item;

          return rest;
        }),
      );

      expect(changed(reopenedUnowned).state).toBe("queued");
    }),
  );

  it.effect("lets a bot change only the items it owns, and the boss change anything", () =>
    Effect.gen(function* () {
      const item = makeItem({ state: "assigned", ownerBotId: SPECIALIST_ID });

      const update = (actorBotId: typeof BOSS_ID) =>
        cmd({
          type: "work-item.update",
          commandId: CommandId.make("cmd-work-item.update"),
          workItemId: ITEM_ID,
          title: "Renamed",
          actorBotId,
        });

      yield* decide(update(SPECIALIST_ID), [item]);
      yield* decide(update(BOSS_ID), [item]);
      yield* fails(decide(update(SPECIALIST_ID), [{ ...item, ownerBotId: undefined } as WorkItem]));
      yield* fails(decide(update(OTHER_SPECIALIST_ID), [item]));
    }),
  );

  it.effect("authorizes a user by group membership or the group-manage right", () =>
    Effect.gen(function* () {
      const update = cmd({
        type: "work-item.update",
        commandId: CommandId.make("cmd-work-item.update"),
        workItemId: ITEM_ID,
        title: "Renamed",
      });

      const outsider = AuthSessionId.make("person-outsider");

      yield* decide(update, [makeItem()], { personId: PERSON_ID, canManageGroups: false });
      yield* decide(update, [makeItem()], { personId: outsider, canManageGroups: true });
      yield* fails(decide(update, [makeItem()], { personId: outsider, canManageGroups: false }));
    }),
  );

  it.effect("deletes a group's work items with the group", () =>
    Effect.gen(function* () {
      const events = yield* decide(
        cmd({
          type: "group.delete",
          commandId: CommandId.make("cmd-group.delete"),
          groupId: GROUP_ID,
        }),
        [makeItem(), makeItem({ id: WorkItemId.make("item-2"), state: "done", doneAt: NOW })],
      );

      const deleted = events.filter(
        (event: Pick<OrchestrationEvent, "type">) => event.type === "work-item.deleted",
      );

      expect(deleted).toHaveLength(2);
      expect(events.at(-1)?.type).toBe("group.deleted");
    }),
  );
});

function events0(events: ReadonlyArray<{ readonly type: string }>): string | undefined {
  return events[0]?.type;
}
