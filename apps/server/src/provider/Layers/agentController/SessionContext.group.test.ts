import { BotId, GroupId, ThreadId, type OrchestrationBot } from "@isnadi/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { createSessionContext } from "./SessionContext.ts";

const boss = BotId.make("bot-boss");

const scout = BotId.make("bot-scout");

const gone = BotId.make("bot-gone");

const groupId = GroupId.make("group-1");

const threadId = ThreadId.make("thread-group");

const bot = (id: BotId, name: string, title: string, archivedAt: string | null = null) =>
  // SAFETY: the context reads only id, name, title and archivedAt.
  ({ id, name, title, archivedAt }) as OrchestrationBot;

const bots = [
  bot(boss, "Boss", "Lead"),
  bot(scout, "Scout", "Researcher"),
  bot(gone, "Gone", "Retired", "2026-01-01T00:00:00.000Z"),
];

const makeContext = (groupMembers: ReadonlyArray<unknown>, respondingBotId: BotId | null) =>
  createSessionContext({
    workerRuntime: {} as never,
    wired: (() => ({})) as never,
    projectionSnapshotQuery: Option.some({
      getThreadRuntimeContext: () =>
        Effect.succeed(Option.some({ groupId, respondingBotId, botId: null })),
      getGroupById: () =>
        Effect.succeed(
          Option.some({ id: groupId, name: "Research", bossBotId: boss, members: groupMembers }),
        ),
      getBotById: (id: BotId) =>
        Effect.succeed(Option.fromNullishOr(bots.find((b) => b.id === id))),
      listThreadDelegations: () => Effect.succeed([]),
    }) as never,
  });

it.effect("describes the group for the responder, skipping archived bots", () =>
  Effect.gen(function* () {
    const { readGroupConversation } = makeContext(
      [
        { kind: "bot", botId: boss, role: "boss" },
        { kind: "bot", botId: scout, role: "specialist" },
        { kind: "bot", botId: gone, role: "specialist" },
        { kind: "person", personId: "session-1", displayName: "Mina" },
      ],
      scout,
    );

    const group = yield* readGroupConversation(threadId, null);

    assert.deepStrictEqual(group, {
      groupName: "Research",
      respondingBotId: scout,
      members: [
        { botId: boss, name: "Boss", role: "boss", title: "Lead" },
        { botId: scout, name: "Scout", role: "specialist", title: "Researcher" },
      ],
      people: ["Mina"],
    });
  }),
);

it.effect("falls back to the boss when no bot is responding", () =>
  Effect.gen(function* () {
    const { readGroupConversation } = makeContext(
      [{ kind: "bot", botId: boss, role: "boss" }],
      null,
    );

    const group = yield* readGroupConversation(threadId, null);

    assert.strictEqual(group?.respondingBotId, boss);
  }),
);

it.effect("returns nothing for a direct chat", () =>
  Effect.gen(function* () {
    const { readGroupConversation } = createSessionContext({
      workerRuntime: {} as never,
      wired: (() => ({})) as never,
      projectionSnapshotQuery: Option.some({
        getThreadRuntimeContext: () =>
          Effect.succeed(Option.some({ groupId: null, respondingBotId: null, botId: boss })),
        getGroupById: () => Effect.succeed(Option.none()),
        getBotById: () => Effect.succeed(Option.none()),
        listThreadDelegations: () => Effect.succeed([]),
      }) as never,
    });

    assert.isUndefined(yield* readGroupConversation(threadId, boss));
  }),
);

it.effect("names the session's bot as the responder when the thread's responder moved on", () =>
  Effect.gen(function* () {
    const { readGroupConversation } = makeContext(
      [
        { kind: "bot", botId: boss, role: "boss" },
        { kind: "bot", botId: scout, role: "specialist" },
      ],
      scout,
    );

    const group = yield* readGroupConversation(threadId, boss);

    assert.strictEqual(group?.respondingBotId, boss);
  }),
);

it.effect("treats a failed group lookup as a direct chat", () =>
  Effect.gen(function* () {
    const { readGroupConversation } = createSessionContext({
      workerRuntime: {} as never,
      wired: (() => ({})) as never,
      projectionSnapshotQuery: Option.some({
        getThreadRuntimeContext: () => Effect.fail("snapshot unavailable"),
        getGroupById: () => Effect.succeed(Option.none()),
        getBotById: () => Effect.succeed(Option.none()),
        listThreadDelegations: () => Effect.succeed([]),
      }) as never,
    });

    assert.isUndefined(yield* readGroupConversation(threadId, boss));
  }),
);
