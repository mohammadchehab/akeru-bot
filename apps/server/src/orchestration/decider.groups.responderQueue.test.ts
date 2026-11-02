import { CommandId, MessageId, ThreadId, TurnId } from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import { decideOrchestrationCommand } from "./decider.ts";
import {
  BOSS_ID,
  GROUP_ID,
  NOW,
  OTHER_SPECIALIST_ID,
  SPECIALIST_ID,
  makeBot,
  makeGroup,
  makeGroupThread,
  makeReadModel,
} from "./test-support/GroupDeciderFixtures.ts";

const USER_MESSAGE = MessageId.make("message-1");

const entry = (botId: typeof SPECIALIST_ID) => ({
  botId,
  trigger: { kind: "user" as const, messageId: USER_MESSAGE },
});

const readModel = (input: {
  readonly queue?: ReadonlyArray<ReturnType<typeof entry>>;
  readonly running?: boolean;
  readonly inactive?: boolean;
}) => {
  const thread = makeGroupThread();

  return makeReadModel({
    bots: [
      makeBot({ id: BOSS_ID, groupId: GROUP_ID }),
      makeBot({
        id: SPECIALIST_ID,
        groupId: GROUP_ID,
        provider: "specialist-provider",
        model: "specialist-model",
        ...(input.inactive ? { archivedAt: NOW } : {}),
      }),
      makeBot({ id: OTHER_SPECIALIST_ID, groupId: GROUP_ID }),
    ],
    groups: [makeGroup()],
    threads: [
      {
        ...thread,
        messages: [
          {
            id: USER_MESSAGE,
            role: "user",
            text: "Please investigate.",
            turnId: null,
            streaming: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        ...(input.queue === undefined
          ? {}
          : {
              responderQueue: {
                entries: input.queue,
                hopsLeft: 6,
                reason: "addressed" as const,
                updatedAt: NOW,
              },
            }),
        ...(input.running
          ? {
              latestTurn: {
                turnId: TurnId.make("turn-running"),
                state: "running" as const,
                requestedAt: NOW,
                startedAt: NOW,
                completedAt: null,
                assistantMessageId: null,
              },
            }
          : {}),
      },
    ],
  });
};

const advance = (model: ReturnType<typeof readModel>) =>
  decideOrchestrationCommand({
    command: {
      type: "thread.responder.advance",
      commandId: CommandId.make("cmd-advance"),
      threadId: ThreadId.make("thread-group"),
      createdAt: NOW,
    },
    readModel: model,
  }).pipe(Effect.map((result) => (Array.isArray(result) ? result : [result])));

it.layer(NodeServices.layer)("group responder queue decider", (it) => {
  it.effect("starts the first queued responder on the message that addressed it", () =>
    Effect.gen(function* () {
      const events = yield* advance(
        readModel({ queue: [entry(SPECIALIST_ID), entry(OTHER_SPECIALIST_ID)] }),
      );

      expect(events.map((event) => event.type)).toEqual([
        "thread.responder-queue.set",
        "thread.turn-start-requested",
      ]);

      const [queue, start] = events;

      if (queue?.type !== "thread.responder-queue.set") throw new Error("Expected queue event");

      if (start?.type !== "thread.turn-start-requested") throw new Error("Expected turn start");

      expect(queue.payload.entries.map((item: { readonly botId: string }) => item.botId)).toEqual([
        OTHER_SPECIALIST_ID,
      ]);
      expect(queue.payload.reason).toBe("turn-started");
      expect(start.payload.respondingBotId).toBe(SPECIALIST_ID);
      expect(start.payload.messageId).toBe(USER_MESSAGE);
      expect(start.payload.trigger).toEqual({ kind: "user", messageId: USER_MESSAGE });
      expect(start.payload.modelSelection).toEqual({
        instanceId: "specialist-provider",
        model: "specialist-model",
      });
    }),
  );

  it.effect("does nothing when the queue is empty or a turn is still running", () =>
    Effect.gen(function* () {
      expect(yield* advance(readModel({ queue: [] }))).toEqual([]);
      expect(yield* advance(readModel({}))).toEqual([]);
      expect(yield* advance(readModel({ queue: [entry(SPECIALIST_ID)], running: true }))).toEqual(
        [],
      );
    }),
  );

  it.effect("drops a queued bot that is no longer an active member instead of starting it", () =>
    Effect.gen(function* () {
      const events = yield* advance(
        readModel({ queue: [entry(SPECIALIST_ID), entry(OTHER_SPECIALIST_ID)], inactive: true }),
      );

      expect(events.map((event) => event.type)).toEqual(["thread.responder-queue.set"]);

      const [queue] = events;

      if (queue?.type !== "thread.responder-queue.set") throw new Error("Expected queue event");
      expect(queue.payload.entries.map((item: { readonly botId: string }) => item.botId)).toEqual([
        OTHER_SPECIALIST_ID,
      ]);
    }),
  );

  it.effect("Stop empties a waiting queue along with interrupting the turn", () =>
    Effect.gen(function* () {
      const stop = (model: ReturnType<typeof readModel>) =>
        decideOrchestrationCommand({
          command: {
            type: "thread.turn.interrupt",
            commandId: CommandId.make("cmd-stop"),
            threadId: ThreadId.make("thread-group"),
            createdAt: NOW,
          },
          readModel: model,
        }).pipe(Effect.map((result) => (Array.isArray(result) ? result : [result])));

      const withQueue = yield* stop(readModel({ queue: [entry(SPECIALIST_ID)] }));

      expect(withQueue.map((event) => event.type)).toEqual([
        "thread.turn-interrupt-requested",
        "thread.responder-queue.set",
      ]);

      const cleared = withQueue[1];

      if (cleared?.type !== "thread.responder-queue.set") throw new Error("Expected queue event");
      expect(cleared.payload.entries).toEqual([]);
      expect(cleared.payload.reason).toBe("stopped");

      const withoutQueue = yield* stop(readModel({}));

      expect(withoutQueue.map((event) => event.type)).toEqual(["thread.turn-interrupt-requested"]);
    }),
  );
});
