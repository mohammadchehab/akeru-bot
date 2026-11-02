import {
  CommandId,
  MessageId,
  ThreadId,
  TurnId,
  type OrchestrationEvent,
  type ResponderQueueReason,
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
  readonly reason?: ResponderQueueReason;
  readonly queueUpdatedAt?: string;
  readonly budgetExhausted?: boolean;
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
                ...(input.budgetExhausted ? { budgetExhausted: true } : {}),
                reason: input.reason ?? ("turn-started" as const),
                updatedAt: input.queueUpdatedAt ?? QUEUED_AT,
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

const REPLY_MESSAGE = MessageId.make("reply-1");

// The finished reply as the projector leaves it: the text joined from the deltas in the read model.
const mention = (
  model: ReturnType<typeof readModel>,
  text: string,
  overrides: {
    readonly turnId?: string;
    readonly replyTurnId?: string;
    readonly replyRole?: "assistant" | "user";
    readonly omitReply?: boolean;
  } = {},
) =>
  decideOrchestrationCommand({
    command: {
      type: "thread.responder.mention",
      commandId: CommandId.make("cmd-mention"),
      threadId: ThreadId.make("thread-group"),
      turnId: TurnId.make(overrides.turnId ?? "turn-latest"),
      botId: SPECIALIST_ID,
      messageId: REPLY_MESSAGE,
      createdAt: NOW,
    },
    readModel:
      overrides.omitReply === true
        ? model
        : {
            ...model,
            threads: model.threads.map((thread) => ({
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: REPLY_MESSAGE,
                  role: overrides.replyRole ?? ("assistant" as const),
                  text,
                  turnId: TurnId.make(overrides.replyTurnId ?? overrides.turnId ?? "turn-latest"),
                  streaming: false,
                  createdAt: NOW,
                  updatedAt: NOW,
                },
              ],
            })),
          },
  }).pipe(Effect.map((result) => (Array.isArray(result) ? result : [result])));

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
  it.effect("queues the bot a finished reply mentions, with the mention as its trigger", () =>
    Effect.gen(function* () {
      const events = yield* mention(readModel({ queue: [] }), `Over to @${OTHER_SPECIALIST_ID}.`);

      expect(events.map((event) => event.type)).toEqual(["thread.responder-queue.set"]);

      const queue = queueOf(events[0]);

      expect(queue.reason).toBe("mention");
      expect(queue).toMatchObject({ hopsLeft: 5, hopsUsed: 1 });
      expect(queue.entries).toEqual([
        {
          botId: OTHER_SPECIALIST_ID,
          trigger: {
            kind: "bot-mention",
            sourceTurnId: TurnId.make("turn-latest"),
            sourceBotId: SPECIALIST_ID,
          },
        },
      ]);
    }),
  );

  it.effect("ignores mentions that name nobody new", () =>
    Effect.gen(function* () {
      const model = readModel({ queue: [entry(OTHER_SPECIALIST_ID)] });

      expect(yield* mention(model, "No names here.")).toEqual([]);
      expect(yield* mention(model, `Note to myself, @${SPECIALIST_ID}.`)).toEqual([]);
      expect(yield* mention(model, "@everyone take a look")).toEqual([]);
      expect(yield* mention(model, "@nobody-by-that-name")).toEqual([]);
      // Already waiting: it will speak once, not twice.
      expect(yield* mention(model, `@${OTHER_SPECIALIST_ID} please`)).toEqual([]);
    }),
  );

  it.effect("starts the mentioned bot next, on the bot that mentioned it", () =>
    Effect.gen(function* () {
      const base = readModel({ queue: [] });
      const [queued] = yield* mention(base, `@${OTHER_SPECIALIST_ID} your turn`);

      if (queued === undefined) throw new Error("Expected a queue event");

      const model = yield* projectEvent(base, { ...queued, sequence: 1 } as OrchestrationEvent);
      const events = yield* advance(model, "cmd-advance-chain");

      // The queue event is newer than the turn, but no turn is in flight, so the chain moves on.
      expect(startedBots(events)).toEqual([OTHER_SPECIALIST_ID]);
      expect(queueOf(events[0])).toMatchObject({ hopsLeft: 4, hopsUsed: 2, entries: [] });
    }),
  );

  it.effect("adds only as many mentioned bots as the budget has left", () =>
    Effect.gen(function* () {
      const events = yield* mention(
        readModel({ queue: [], hopsLeft: 1 }),
        `@${OTHER_SPECIALIST_ID} then @${BOSS_ID}`,
      );

      expect(
        queueOf(events[0]).entries.map((item: { readonly botId: string }) => item.botId),
      ).toEqual([OTHER_SPECIALIST_ID]);
      expect(queueOf(events[0]).reason).toBe("mention");
    }),
  );

  it.effect("ends the chain with a budget-exhausted queue when the budget is spent", () =>
    Effect.gen(function* () {
      const events = yield* mention(
        readModel({ queue: [], hopsLeft: 0, hopsUsed: 6 }),
        `@${OTHER_SPECIALIST_ID} one more`,
      );

      expect(events.map((event) => event.type)).toEqual(["thread.responder-queue.set"]);
      expect(queueOf(events[0])).toMatchObject({
        entries: [],
        reason: "budget-exhausted",
        budgetExhausted: true,
        hopsLeft: 0,
        hopsUsed: 6,
      });
    }),
  );

  it.effect(
    "never cuts a bot the user addressed, and still records that the budget cut a chain",
    () =>
      Effect.gen(function* () {
        const events = yield* mention(
          readModel({ queue: [entry(BOSS_ID)], hopsLeft: 0, hopsUsed: 6 }),
          `@${OTHER_SPECIALIST_ID} one more`,
        );

        // The addressed bot keeps its place. The reason does not claim the chain ended, and the
        // sticky flag is what lets the notice show once the queue has emptied.
        expect(queueOf(events[0]).reason).toBe("mention");
        expect(queueOf(events[0]).budgetExhausted).toBe(true);
        expect(
          queueOf(events[0]).entries.map((item: { readonly botId: string }) => item.botId),
        ).toEqual([BOSS_ID]);
      }),
  );

  it.effect("keeps the exhausted flag on every later queue event of the same message", () =>
    Effect.gen(function* () {
      const model = readModel({
        queue: [entry(SPECIALIST_ID), entry(OTHER_SPECIALIST_ID)],
        budgetExhausted: true,
      });

      const popped = yield* advance(model);

      expect(queueOf(popped[0])).toMatchObject({ reason: "turn-started", budgetExhausted: true });

      const clean = yield* advance(readModel({ queue: [entry(SPECIALIST_ID)] }));

      expect(queueOf(clean[0]).budgetExhausted).toBeUndefined();
    }),
  );

  it.effect("ignores a reply that is no longer the chat's latest turn, or was stopped", () =>
    Effect.gen(function* () {
      const text = `@${OTHER_SPECIALIST_ID} hi`;

      expect(yield* mention(readModel({ queue: [] }), text, { turnId: "turn-older" })).toEqual([]);
      expect(yield* mention(readModel({ turn: "none", queue: [] }), text)).toEqual([]);

      // Stop, or a newer user message, rewrote the queue after this turn began.
      for (const reason of ["stopped", "superseded", "addressed"] as const) {
        expect(
          yield* mention(readModel({ queue: [], reason, queueUpdatedAt: AFTER_QUEUED }), text),
        ).toEqual([]);
      }
    }),
  );

  it.effect("does nothing for a chat that is not a group chat", () =>
    Effect.gen(function* () {
      const model = readModel({ queue: [] });
      const [thread] = model.threads;

      if (thread === undefined) throw new Error("Expected a thread");

      const direct = { ...model, threads: [{ ...thread, groupId: null }] };

      expect(yield* mention(direct, `@${OTHER_SPECIALIST_ID} hi`)).toEqual([]);
    }),
  );
  it.effect("does not chain on mentions in code, quotes or @everyone, but reads the rest", () =>
    Effect.gen(function* () {
      const model = readModel({ queue: [] });
      const other = `@${OTHER_SPECIALIST_ID}`;

      // The user's own words echoed back, or code that merely contains a name, address nobody.
      expect(yield* mention(model, `> ${other} please look\nNoted.`)).toEqual([]);
      expect(yield* mention(model, `Run \`${other}\` to see it.`)).toEqual([]);
      expect(yield* mention(model, `\`\`\`\n${other}\n\`\`\`\nDone.`)).toEqual([]);
      // A bot cannot address everyone.
      expect(yield* mention(model, "@everyone status?")).toEqual([]);

      const events = yield* mention(model, `@everyone, ${other} check`);

      expect(
        queueOf(events[0]).entries.map((item: { readonly botId: string }) => item.botId),
      ).toEqual([OTHER_SPECIALIST_ID]);
    }),
  );

  it.effect("writes nothing when a dropped mention changes nothing", () =>
    Effect.gen(function* () {
      const events = yield* mention(
        readModel({ queue: [entry(BOSS_ID)], hopsLeft: 0, hopsUsed: 6, budgetExhausted: true }),
        `@${OTHER_SPECIALIST_ID} one more`,
      );

      expect(events).toEqual([]);
    }),
  );
  it.effect(
    "ignores a mention whose reply is missing, is not the bot's, or is from another turn",
    () =>
      Effect.gen(function* () {
        const model = readModel({ queue: [] });
        const text = `Over to @${OTHER_SPECIALIST_ID}.`;

        expect(yield* mention(model, text, { omitReply: true })).toEqual([]);
        expect(yield* mention(model, text, { replyRole: "user" })).toEqual([]);
        expect(yield* mention(model, text, { replyTurnId: "turn-older" })).toEqual([]);
        expect((yield* mention(model, text)).map((event) => event.type)).toEqual([
          "thread.responder-queue.set",
        ]);
      }),
  );
});
