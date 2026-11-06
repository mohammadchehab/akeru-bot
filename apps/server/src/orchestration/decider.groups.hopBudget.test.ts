import {
  AuthSessionId,
  CommandId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationEvent,
} from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import { decideOrchestrationCommand } from "./decider.ts";
import { projectEvent } from "./projector.ts";
import {
  BOSS_ID,
  GROUP_ID,
  NOW,
  SPECIALIST_ID,
  makeBot,
  makeGroup,
  makeGroupThread,
  makeReadModel,
  startTurnCommand,
} from "./test-support/GroupDeciderFixtures.ts";

const setHopBudget = (hopBudget: number, threadId = "thread-group") => ({
  type: "thread.hop-budget.set" as const,
  commandId: CommandId.make("cmd-hop-budget"),
  threadId: ThreadId.make(threadId),
  hopBudget,
  createdAt: NOW,
});

it.layer(NodeServices.layer)("group chat hop budget decider", (it) => {
  it.effect("records the budget on a group chat, and the projection keeps it", () =>
    Effect.gen(function* () {
      const model = makeReadModel({ groups: [makeGroup()], threads: [makeGroupThread()] });

      const result = yield* decideOrchestrationCommand({
        command: setHopBudget(3),
        readModel: model,
      });

      const event = Array.isArray(result) ? result[0] : result;

      if (event?.type !== "thread.hop-budget-set") throw new Error("Expected hop budget event");
      expect(event.payload).toEqual({
        threadId: ThreadId.make("thread-group"),
        hopBudget: 3,
        updatedAt: NOW,
      });

      const projected = yield* projectEvent(model, { ...event, sequence: 1 } as OrchestrationEvent);

      expect(projected.threads[0]?.hopBudget).toBe(3);
    }),
  );

  it.effect("refuses a chat that is not a group chat", () =>
    Effect.gen(function* () {
      const direct = { ...makeGroupThread(), groupId: null };

      const error = yield* decideOrchestrationCommand({
        command: setHopBudget(3),
        readModel: makeReadModel({ groups: [makeGroup()], threads: [direct] }),
      }).pipe(Effect.flip);

      expect(String(error)).toContain("not a group chat");
    }),
  );

  it.effect("refuses a chat that does not exist", () =>
    Effect.gen(function* () {
      const error = yield* decideOrchestrationCommand({
        command: setHopBudget(3, "thread-missing"),
        readModel: makeReadModel({ groups: [makeGroup()], threads: [makeGroupThread()] }),
      }).pipe(Effect.flip);

      expect(String(error)).toContain("thread-missing");
    }),
  );

  const createInGroup = (group: ReturnType<typeof makeGroup>) =>
    decideOrchestrationCommand({
      command: {
        type: "thread.create",
        commandId: CommandId.make("cmd-create-in-group"),
        threadId: ThreadId.make("thread-new"),
        projectId: ProjectId.make("project-1"),
        groupId: group.id,
        title: "New chat",
        modelSelection: { instanceId: ProviderInstanceId.make("default"), model: "default-model" },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        createdAt: NOW,
      },
      readModel: {
        ...makeReadModel({ groups: [group] }),
        projects: [
          {
            id: ProjectId.make("project-1"),
            title: "Project",
            workspaceRoot: "/tmp/project",
            defaultModelSelection: null,
            scripts: [],
            createdAt: NOW,
            updatedAt: NOW,
            deletedAt: null,
          },
        ],
      },
      actor: { personId: AuthSessionId.make("admin"), canManageGroups: true },
    }).pipe(Effect.map((result) => (Array.isArray(result) ? result[0] : result)));

  it.effect("seeds a new chat with the group's default budget", () =>
    Effect.gen(function* () {
      const event = yield* createInGroup({ ...makeGroup(), hopBudget: 9 });

      if (event?.type !== "thread.created") throw new Error("Expected thread.created");
      expect(event.payload.hopBudget).toBe(9);
    }),
  );

  it.effect("leaves the budget unset when the group has no default", () =>
    Effect.gen(function* () {
      const event = yield* createInGroup(makeGroup());

      if (event?.type !== "thread.created") throw new Error("Expected thread.created");
      expect(event.payload.hopBudget).toBeUndefined();
    }),
  );

  const startMessage = (threadOverrides: {
    readonly hopBudget?: number;
    readonly direct?: boolean;
  }) =>
    decideOrchestrationCommand({
      command: startTurnCommand(),
      readModel: makeReadModel({
        bots: [
          makeBot({ id: BOSS_ID, groupId: GROUP_ID }),
          makeBot({ id: SPECIALIST_ID, groupId: GROUP_ID }),
        ],
        groups: [makeGroup()],
        threads: [
          {
            ...makeGroupThread(),
            ...(threadOverrides.hopBudget === undefined
              ? {}
              : { hopBudget: threadOverrides.hopBudget }),
            ...(threadOverrides.direct ? { groupId: null, botId: BOSS_ID } : {}),
          },
        ],
      }),
    }).pipe(
      Effect.map((result) => (Array.isArray(result) ? result : [result])),
      Effect.map((events) => events.find((event) => event.type === "thread.responder-queue.set")),
    );

  it.effect("snapshots the chat's budget into the queue when a user message starts a chain", () =>
    Effect.gen(function* () {
      const queue = yield* startMessage({ hopBudget: 3 });

      if (queue?.type !== "thread.responder-queue.set") throw new Error("Expected queue event");
      // The first bot's turn is the first hop.
      expect(queue.payload).toMatchObject({ entries: [], hopsLeft: 2, hopsUsed: 1 });
    }),
  );

  it.effect("uses the default budget for a chat that never set one", () =>
    Effect.gen(function* () {
      const queue = yield* startMessage({});

      if (queue?.type !== "thread.responder-queue.set") throw new Error("Expected queue event");
      expect(queue.payload).toMatchObject({ hopsLeft: 5, hopsUsed: 1 });
    }),
  );
});
