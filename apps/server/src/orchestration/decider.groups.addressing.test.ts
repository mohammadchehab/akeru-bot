import {
  BotId,
  MessageId,
  TurnId,
  type GroupAddressing,
  type OrchestrationMessage,
} from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import { decideOrchestrationCommand } from "./decider.ts";
import {
  BOSS_ID,
  GROUP_ID,
  NOW,
  OTHER_SPECIALIST_ID,
  PERSON_ID,
  SPECIALIST_ID,
  makeBot,
  makeGroup,
  makeGroupThread,
  makeReadModel,
  startTurnCommand,
} from "./test-support/GroupDeciderFixtures.ts";

const OUTSIDER_ID = BotId.make("bot-outsider");

const botReply = (id: string, respondingBotId: BotId | null): OrchestrationMessage => ({
  id: MessageId.make(id),
  role: "assistant",
  text: "an answer",
  turnId: TurnId.make(`turn-${id}`),
  streaming: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...(respondingBotId === null ? {} : { respondingBotId }),
});

const readModel = () =>
  makeReadModel({
    bots: [
      makeBot({ id: BOSS_ID, groupId: GROUP_ID }),
      makeBot({ id: SPECIALIST_ID, groupId: GROUP_ID }),
      makeBot({ id: OTHER_SPECIALIST_ID, groupId: GROUP_ID }),
      makeBot({ id: OUTSIDER_ID }),
    ],
    groups: [
      makeGroup({
        members: [
          { kind: "bot", botId: BOSS_ID, role: "boss" },
          { kind: "bot", botId: SPECIALIST_ID, role: "specialist" },
          { kind: "bot", botId: OTHER_SPECIALIST_ID, role: "specialist" },
          { kind: "person", personId: PERSON_ID, displayName: "Member" },
        ],
      }),
    ],
    threads: [
      {
        ...makeGroupThread(),
        messages: [
          botReply("reply-specialist", SPECIALIST_ID),
          botReply("reply-unlabelled", null),
          { ...botReply("user-message", null), role: "user" },
        ],
      },
    ],
  });

const decideTurnStart = (addressing: GroupAddressing) =>
  decideOrchestrationCommand({
    command: { ...startTurnCommand(), addressing },
    readModel: readModel(),
  });

type Decided = Effect.Success<ReturnType<typeof decideOrchestrationCommand>>;

const summarize = (result: Decided) => {
  const events = Array.isArray(result) ? result : [result];
  const event = events.find((entry) => entry.type === "thread.turn-start-requested");

  if (event?.type !== "thread.turn-start-requested") throw new Error("Expected turn start");

  const queue = events.find((entry) => entry.type === "thread.responder-queue.set");

  return {
    ...event.payload,
    queuedResponderBotIds:
      queue?.type === "thread.responder-queue.set"
        ? queue.payload.entries.map((entry: { readonly botId: BotId }) => entry.botId)
        : [],
    queueEvent: queue?.type === "thread.responder-queue.set" ? queue.payload : null,
  };
};

const turnStart = (addressing: GroupAddressing) =>
  decideTurnStart(addressing).pipe(Effect.map(summarize));

const turnStartError = (addressing: GroupAddressing) =>
  decideTurnStart(addressing).pipe(Effect.flip);

it.layer(NodeServices.layer)("group turn addressing", (it) => {
  it.effect("auto addressing answers as the boss until auto routing exists", () =>
    Effect.gen(function* () {
      const payload = yield* turnStart({ kind: "auto" });

      expect(payload.respondingBotId).toBe(BOSS_ID);
      expect(payload.queuedResponderBotIds ?? []).toEqual([]);
    }),
  );

  it.effect("bots addressing runs the first named bot and queues the rest in order", () =>
    Effect.gen(function* () {
      const payload = yield* turnStart({
        kind: "bots",
        botIds: [OTHER_SPECIALIST_ID, SPECIALIST_ID, OTHER_SPECIALIST_ID],
      });

      expect(payload.respondingBotId).toBe(OTHER_SPECIALIST_ID);
      expect(payload.queuedResponderBotIds).toEqual([SPECIALIST_ID]);
      expect(payload.queueEvent?.reason).toBe("addressed");
      expect(payload.queueEvent?.entries[0]?.trigger).toEqual({
        kind: "user",
        messageId: "message-1",
      });
      expect(payload.queueEvent?.hopsLeft).toBe(6);
    }),
  );

  it.effect("everyone addressing answers boss first, then the other members in member order", () =>
    Effect.gen(function* () {
      const payload = yield* turnStart({ kind: "everyone" });

      expect(payload.respondingBotId).toBe(BOSS_ID);
      expect(payload.queuedResponderBotIds).toEqual([SPECIALIST_ID, OTHER_SPECIALIST_ID]);
    }),
  );

  it.effect("reply addressing goes to the bot that wrote the message", () =>
    Effect.gen(function* () {
      const payload = yield* turnStart({
        kind: "reply",
        messageId: MessageId.make("reply-specialist"),
      });

      expect(payload.respondingBotId).toBe(SPECIALIST_ID);
      expect(payload.queuedResponderBotIds ?? []).toEqual([]);
    }),
  );

  it.effect("fails a reply to a user message or to a message with no recorded bot", () =>
    Effect.gen(function* () {
      for (const messageId of ["reply-unlabelled", "user-message"]) {
        const error = yield* turnStartError({
          kind: "reply",
          messageId: MessageId.make(messageId),
        });

        expect(String(error)).toContain(messageId);
      }
    }),
  );

  it.effect("fails when both addressing and respondingBotId are sent", () =>
    Effect.gen(function* () {
      const error = yield* decideOrchestrationCommand({
        command: { ...startTurnCommand(SPECIALIST_ID), addressing: { kind: "everyone" as const } },
        readModel: readModel(),
      }).pipe(Effect.flip);

      expect(String(error)).toContain("not both");
    }),
  );

  it.effect("a new user message empties a queue left over from the last one", () =>
    Effect.gen(function* () {
      const base = readModel();

      const withQueue = {
        ...base,
        threads: base.threads.map((thread) => ({
          ...thread,
          responderQueue: {
            entries: [
              {
                botId: SPECIALIST_ID,
                trigger: { kind: "user" as const, messageId: MessageId.make("old") },
              },
            ],
            hopsLeft: 6,
            reason: "addressed" as const,
            updatedAt: NOW,
          },
        })),
      };

      const result = yield* decideOrchestrationCommand({
        command: startTurnCommand(),
        readModel: withQueue,
      });

      const queue = (Array.isArray(result) ? result : [result]).find(
        (entry) => entry.type === "thread.responder-queue.set",
      );

      if (queue?.type !== "thread.responder-queue.set") throw new Error("Expected a queue event");
      expect(queue.payload.entries).toEqual([]);
      expect(queue.payload.reason).toBe("superseded");
    }),
  );

  it.effect("fails a mention of a bot that is not an active member, naming it", () =>
    Effect.gen(function* () {
      const error = yield* turnStartError({ kind: "bots", botIds: [SPECIALIST_ID, OUTSIDER_ID] });

      expect(String(error)).toContain(OUTSIDER_ID);
    }),
  );

  it.effect("fails a reply to a message that does not exist", () =>
    Effect.gen(function* () {
      const error = yield* turnStartError({ kind: "reply", messageId: MessageId.make("missing") });

      expect(String(error)).toContain("missing");
    }),
  );

  it.effect("keeps a plain respondingBotId working as a single-bot address", () =>
    Effect.gen(function* () {
      const result = yield* decideOrchestrationCommand({
        command: startTurnCommand(SPECIALIST_ID),
        readModel: readModel(),
      });

      const event = (Array.isArray(result) ? result : [result]).find(
        (entry) => entry.type === "thread.turn-start-requested",
      );

      if (event?.type !== "thread.turn-start-requested") throw new Error("Expected turn start");
      expect(event.payload.respondingBotId).toBe(SPECIALIST_ID);
      expect(event.payload.queuedResponderBotIds ?? []).toEqual([]);
    }),
  );
});
