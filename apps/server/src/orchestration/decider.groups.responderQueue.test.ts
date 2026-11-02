import { CommandId, MessageId, ThreadId, TurnId, type OrchestrationEvent } from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import { decideOrchestrationCommand } from "./decider.ts";
import { projectEvent } from "./projector.ts";
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

// The queue was written, and its bot's turn requested, at QUEUED_AT. Turns and sessions are
// placed relative to it to say whether that turn has appeared, is running, or has ended.
const QUEUED_AT = "2025-12-31T23:30:00.000Z";

const BEFORE_QUEUED = "2025-12-31T23:10:00.000Z";

const AFTER_QUEUED = "2025-12-31T23:45:00.000Z";

type Turn = "completed" | "running" | "unseen" | "none";

const readModel = (input: {
  readonly queue?: ReadonlyArray<ReturnType<typeof entry>>;
  readonly turn?: Turn;
  readonly session?: { readonly status: "running" | "ready" | "error"; readonly updatedAt: string };
  readonly inactive?: ReadonlyArray<typeof SPECIALIST_ID>;
  readonly hopsLeft?: number;
  readonly hopsUsed?: number;
}) => {
  const thread = makeGroupThread();
  const turn = input.turn ?? "completed";

  return makeReadModel({
    bots: [
      makeBot({ id: BOSS_ID, groupId: GROUP_ID }),
      makeBot({
        id: SPECIALIST_ID,
        groupId: GROUP_ID,
        provider: "specialist-provider",
        model: "specialist-model",
        ...(input.inactive?.includes(SPECIALIST_ID) ? { archivedAt: NOW } : {}),
      }),
      makeBot({ id: OTHER_SPECIALIST_ID, groupId: GROUP_ID }),
    ],
    groups: [
      makeGroup({
        members: [
          { kind: "bot", botId: BOSS_ID, role: "boss" },
          { kind: "bot", botId: SPECIALIST_ID, role: "specialist" },
          { kind: "bot", botId: OTHER_SPECIALIST_ID, role: "specialist" },
        ],
      }),
    ],
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
                hopsLeft: input.hopsLeft ?? 5,
                hopsUsed: input.hopsUsed ?? 1,
                reason: "turn-started" as const,
                updatedAt: QUEUED_AT,
              },
            }),
        ...(turn === "none"
          ? {}
          : {
              latestTurn: {
                turnId: TurnId.make("turn-latest"),
                state: turn === "running" ? ("running" as const) : ("completed" as const),
                requestedAt: turn === "unseen" ? BEFORE_QUEUED : QUEUED_AT,
                startedAt: QUEUED_AT,
                completedAt: turn === "running" ? null : AFTER_QUEUED,
                assistantMessageId: null,
              },
            }),
        ...(input.session === undefined
          ? {}
          : {
              session: {
                threadId: thread.id,
                status: input.session.status,
                providerName: "codex",
                runtimeMode: "full-access" as const,
                activeTurnId: null,
                lastError: null,
                updatedAt: input.session.updatedAt,
              },
            }),
      },
    ],
  });
};

const advance = (model: ReturnType<typeof readModel>, commandId = "cmd-advance") =>
  decideOrchestrationCommand({
    command: {
      type: "thread.responder.advance",
      commandId: CommandId.make(commandId),
      threadId: ThreadId.make("thread-group"),
      createdAt: NOW,
    },
    readModel: model,
  }).pipe(Effect.map((result) => (Array.isArray(result) ? result : [result])));

const queueOf = (event: ReturnType<typeof Array.prototype.at> & { type?: string }) => {
  if (event?.type !== "thread.responder-queue.set") throw new Error("Expected queue event");

  return event.payload;
};

const startedBots = (events: Effect.Success<ReturnType<typeof advance>>) =>
  events.flatMap((event) =>
    event.type === "thread.turn-start-requested" ? [event.payload.respondingBotId] : [],
  );

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

      if (start?.type !== "thread.turn-start-requested") throw new Error("Expected turn start");

      expect(queueOf(queue).entries.map((item: { readonly botId: string }) => item.botId)).toEqual([
        OTHER_SPECIALIST_ID,
      ]);
      expect(queueOf(queue).reason).toBe("turn-started");
      expect(start.payload.respondingBotId).toBe(SPECIALIST_ID);
      expect(start.payload.messageId).toBe(USER_MESSAGE);
      expect(start.payload.trigger).toEqual({ kind: "user", messageId: USER_MESSAGE });
      expect(start.payload.modelSelection).toEqual({
        instanceId: "specialist-provider",
        model: "specialist-model",
      });
    }),
  );

  it.effect("counts each started turn against the budget, and never goes below zero", () =>
    Effect.gen(function* () {
      const counted = yield* advance(
        readModel({ queue: [entry(SPECIALIST_ID)], hopsLeft: 5, hopsUsed: 1 }),
      );

      expect(queueOf(counted[0])).toMatchObject({ hopsLeft: 4, hopsUsed: 2 });

      // An addressed bot still runs once the budget is spent; only the count floors at zero.
      const spent = yield* advance(
        readModel({ queue: [entry(SPECIALIST_ID)], hopsLeft: 0, hopsUsed: 6 }),
      );

      expect(startedBots(spent)).toEqual([SPECIALIST_ID]);
      expect(queueOf(spent[0])).toMatchObject({ hopsLeft: 0, hopsUsed: 7 });
    }),
  );

  it.effect("does nothing when the queue is empty or the started turn is still in flight", () =>
    Effect.gen(function* () {
      const queue = [entry(SPECIALIST_ID)];

      expect(yield* advance(readModel({ queue: [] }))).toEqual([]);
      expect(yield* advance(readModel({}))).toEqual([]);
      expect(yield* advance(readModel({ queue, turn: "running" }))).toEqual([]);
      expect(
        yield* advance(readModel({ queue, session: { status: "running", updatedAt: QUEUED_AT } })),
      ).toEqual([]);
      // The turn the queue just started has not shown up in the read model yet.
      expect(yield* advance(readModel({ queue, turn: "none" }))).toEqual([]);
      expect(yield* advance(readModel({ queue, turn: "unseen" }))).toEqual([]);
    }),
  );

  it.effect("two advances back to back start exactly one turn", () =>
    Effect.gen(function* () {
      const first = yield* advance(
        readModel({ queue: [entry(SPECIALIST_ID), entry(OTHER_SPECIALIST_ID)] }),
        "cmd-advance-1",
      );

      // Project the first advance onto a read model whose last turn is the one that addressed
      // the queue: the new turn is requested but has not appeared yet.
      let model = readModel({ queue: [entry(SPECIALIST_ID), entry(OTHER_SPECIALIST_ID)] });

      for (const [index, event] of first.entries()) {
        model = yield* projectEvent(model, {
          ...event,
          sequence: index + 1,
        } as OrchestrationEvent);
      }

      const second = yield* advance(model, "cmd-advance-2");

      expect(startedBots(first)).toEqual([SPECIALIST_ID]);
      expect(second).toEqual([]);
    }),
  );

  it.effect("starts the next bot when a session failed after the turn was requested", () =>
    Effect.gen(function* () {
      const queue = [entry(OTHER_SPECIALIST_ID)];

      const failed = yield* advance(
        readModel({
          queue,
          turn: "unseen",
          session: { status: "error", updatedAt: AFTER_QUEUED },
        }),
      );

      expect(startedBots(failed)).toEqual([OTHER_SPECIALIST_ID]);

      // An error from before the request belongs to the previous bot and means nothing here.
      const stale = yield* advance(
        readModel({
          queue,
          turn: "unseen",
          session: { status: "error", updatedAt: BEFORE_QUEUED },
        }),
      );

      expect(stale).toEqual([]);
    }),
  );

  it.effect(
    "skips every leading bot that left the group and starts the first one still in it",
    () =>
      Effect.gen(function* () {
        const events = yield* advance(
          readModel({
            queue: [entry(SPECIALIST_ID), entry(OTHER_SPECIALIST_ID)],
            inactive: [SPECIALIST_ID],
          }),
        );

        expect(startedBots(events)).toEqual([OTHER_SPECIALIST_ID]);
        expect(queueOf(events[0]).entries).toEqual([]);
      }),
  );

  it.effect("ends the queue when nobody waiting is still in the group", () =>
    Effect.gen(function* () {
      const events = yield* advance(
        readModel({ queue: [entry(SPECIALIST_ID)], inactive: [SPECIALIST_ID], hopsLeft: 3 }),
      );

      expect(events.map((event) => event.type)).toEqual(["thread.responder-queue.set"]);
      expect(queueOf(events[0])).toMatchObject({
        entries: [],
        reason: "superseded",
        hopsLeft: 3,
      });
    }),
  );

  it.effect(
    "Stop empties a waiting queue along with interrupting the turn, keeping the budget",
    () =>
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

        const withQueue = yield* stop(
          readModel({ queue: [entry(SPECIALIST_ID)], hopsLeft: 2, hopsUsed: 4 }),
        );

        expect(withQueue.map((event) => event.type)).toEqual([
          "thread.turn-interrupt-requested",
          "thread.responder-queue.set",
        ]);
        expect(queueOf(withQueue[1])).toMatchObject({
          entries: [],
          reason: "stopped",
          hopsLeft: 2,
          hopsUsed: 4,
        });

        const withoutQueue = yield* stop(readModel({}));

        expect(withoutQueue.map((event) => event.type)).toEqual([
          "thread.turn-interrupt-requested",
        ]);
      }),
  );
});
