import { partialSdkFixture } from "./test-support/partialSdkFixture.ts";
import { describe } from "vite-plus/test";
import { MessageList } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { Memory } from "@mastra/memory";
import { ObservationalMemory } from "@mastra/memory/processors";
import { expect, it, vi } from "vite-plus/test";
import { createIsnadiConversation } from "./mastra/IsnadiConversation.ts";
import { type GroupConversationState } from "./mastra/IsnadiGroupConversation.ts";
import { resolveIsnadiInstructions } from "./mastra/IsnadiInstructions.ts";
import { IsnadiPassiveObservationalMemoryProcessor } from "./IsnadiMastraHarness.ts";

const group: GroupConversationState = {
  groupName: "Research",
  respondingBotId: "bot-2",
  members: [
    { botId: "bot-1", name: "Bot1", role: "boss", title: "Lead" },
    { botId: "bot-2", name: "Bot2", role: "specialist", title: "Scout" },
  ],
  people: [],
};

const requestContext = (state: {
  readonly group?: GroupConversationState;
  readonly botConversation?: boolean;
  readonly botName?: string;
}) => {
  const context = new RequestContext();
  context.set("controller", { state });

  return context;
};

const savedMessage = (id: string, role: "user" | "assistant", text: string, speaker?: string) => ({
  id,
  role,
  createdAt: new Date("2026-08-31T20:00:00.000Z"),
  threadId: "thread-group",
  resourceId: "thread-group",
  content: {
    format: 2 as const,
    parts: [{ type: "text" as const, text }],
    ...(speaker ? { metadata: { respondingBotId: speaker } } : {}),
  },
});

const makeProcessor = (history: ReadonlyArray<ReturnType<typeof savedMessage>>) => {
  const persistMessages = vi.fn(async (_messages: ReadonlyArray<unknown>) => undefined);

  const engine = partialSdkFixture<ObservationalMemory>({
    getThreadContext: vi.fn(() => ({ threadId: "thread-group", resourceId: "thread-group" })),
    loadUnobservedMessages: vi.fn(async () => []),
    getOrCreateRecord: vi.fn(async () => ({ activeObservations: "" })),
    buildContextSystemMessages: vi.fn(async () => []),
  });

  const processor = new IsnadiPassiveObservationalMemoryProcessor(
    engine,
    partialSdkFixture<Memory>({
      recall: vi.fn(async () => ({ messages: [...history] })),
      persistMessages,
    }),
  );

  return { processor, persistMessages };
};

describe("group chat history", () => {
  it("recalls another bot's turn as quoted user text and keeps the responder's own turns", async () => {
    const { processor } = makeProcessor([
      savedMessage("u1", "user", "hello team"),
      savedMessage("a1", "assistant", "Bot1 here", "bot-1"),
      savedMessage("u2", "user", "and you?"),
      savedMessage("a2", "assistant", "Bot2 here", "bot-2"),
    ]);

    const messageList = new MessageList({ threadId: "thread-group", resourceId: "thread-group" });

    await processor.processInputStep({
      stepNumber: 0,
      messageList,
      requestContext: requestContext({ group }),
    } as never);

    const recalled = messageList.get.all.db().map((message) => ({
      id: message.id,
      role: message.role,
      text: message.content.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])),
    }));

    expect(recalled).toEqual([
      { id: "u1", role: "user", text: ["hello team"] },
      {
        id: "a1",
        role: "user",
        text: ['<group-message from="Bot1" role="boss">Bot1 here</group-message>'],
      },
      { id: "u2", role: "user", text: ["and you?"] },
      { id: "a2", role: "assistant", text: ["Bot2 here"] },
    ]);
  });

  it("does not rewrite a direct chat", async () => {
    const { processor } = makeProcessor([
      savedMessage("u1", "user", "hi"),
      savedMessage("a1", "assistant", "hello", "bot-1"),
    ]);

    const messageList = new MessageList({ threadId: "thread-group", resourceId: "thread-group" });

    await processor.processInputStep({
      stepNumber: 0,
      messageList,
      requestContext: requestContext({ botConversation: true }),
    } as never);

    expect(messageList.get.all.db().map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("saves a live group reply with its speaker and leaves a direct chat untagged", async () => {
    for (const [state, expected] of [
      [{ group }, { respondingBotId: "bot-2" }],
      [{ botConversation: true }, undefined],
    ] as const) {
      const { processor, persistMessages } = makeProcessor([]);
      const messageList = new MessageList({ threadId: "thread-group", resourceId: "thread-group" });
      messageList.add(savedMessage("user-now", "user", "question"), "input");
      messageList.add(savedMessage("assistant-now", "assistant", "answer"), "response");

      await processor.processOutputResult({
        messageList,
        requestContext: requestContext({ ...state }),
      } as never);

      const saved = (persistMessages.mock.calls[0]?.[0] ?? []) as ReadonlyArray<
        ReturnType<typeof savedMessage>
      >;

      expect(saved.find((message) => message.id === "user-now")?.content.metadata).toBeUndefined();
      expect(saved.find((message) => message.id === "assistant-now")?.content.metadata).toEqual(
        expected,
      );
    }
  });

  it("saves an externally run group turn with its speaker", async () => {
    const persistMessages = vi.fn(async (_messages: ReadonlyArray<unknown>) => undefined);

    const conversation = createIsnadiConversation(
      {
        memory: partialSdkFixture<Memory>({
          getThreadById: vi.fn(async () => ({ id: "thread-group" })),
          persistMessages,
        }),
      } as never,
      () => undefined,
      async (_threadId, _resourceId, work) => work(),
      { run: () => undefined },
    );

    await conversation.persistExternalTurn({
      threadId: "thread-group",
      turnId: "turn-1",
      modelId: "model",
      userMessages: [{ id: "p1", text: "question" }],
      assistant: "answer",
      createdAt: "2026-08-31T20:00:00.000Z",
      respondingBotId: "bot-2",
    });

    const saved = (persistMessages.mock.calls[0]?.[0] ?? []) as ReadonlyArray<
      ReturnType<typeof savedMessage>
    >;

    expect(saved.find((message) => message.role === "assistant")?.content.metadata).toEqual({
      respondingBotId: "bot-2",
    });
    expect(saved.find((message) => message.role === "user")?.content.metadata).toBeUndefined();
  });
});

describe("group instructions", () => {
  it("adds the roster for a group and omits it in a direct chat", () => {
    const grouped = resolveIsnadiInstructions(
      requestContext({ botConversation: true, botName: "Bot2", group }),
    );

    expect(grouped).toContain("Bot1 (bot-1), boss: Lead");
    expect(grouped).toContain("You are Bot2.");

    const direct = resolveIsnadiInstructions(
      requestContext({ botConversation: true, botName: "Bot2" }),
    );

    expect(direct).not.toContain("group chat");
    expect(direct).not.toContain("<group-message");
  });

  it("shows a member added between turns on the next resolve", () => {
    const first = resolveIsnadiInstructions(requestContext({ botConversation: true, group }));

    const next = resolveIsnadiInstructions(
      requestContext({
        botConversation: true,
        group: {
          ...group,
          members: [
            ...group.members,
            { botId: "bot-3", name: "Bot3", role: "specialist", title: "Editor" },
          ],
        },
      }),
    );

    expect(first).not.toContain("Bot3");
    expect(next).toContain("Bot3 (bot-3), specialist: Editor");
  });
});
