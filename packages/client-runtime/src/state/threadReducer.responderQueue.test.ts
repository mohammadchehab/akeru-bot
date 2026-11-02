import { BotId, MessageId, ThreadId, type OrchestrationEvent } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { applyThreadDetailEvent } from "./threadReducer.ts";
import { baseEventFields, baseThread } from "./threadReducer.test-support.ts";

const queueSet = (
  entries: ReadonlyArray<string>,
  updatedAt = "2026-04-01T01:00:00.000Z",
  budgetExhausted = false,
): OrchestrationEvent => ({
  ...baseEventFields,
  sequence: 7,
  occurredAt: updatedAt,
  aggregateKind: "thread",
  aggregateId: ThreadId.make("thread-1"),
  type: "thread.responder-queue.set",
  payload: {
    threadId: ThreadId.make("thread-1"),
    entries: entries.map((botId) => ({
      botId: BotId.make(botId),
      trigger: { kind: "user" as const, messageId: MessageId.make("message-1") },
    })),
    hopsLeft: 5,
    hopsUsed: 1,
    ...(budgetExhausted ? { budgetExhausted: true } : {}),
    reason: "addressed",
    updatedAt,
  },
});

describe("thread.responder-queue.set", () => {
  it("shows who is waiting, then drops the queue once nobody is", () => {
    const waiting = applyThreadDetailEvent(baseThread, queueSet(["bot-a", "bot-b"]));

    expect(waiting.kind).toBe("updated");

    if (waiting.kind !== "updated") return;

    expect(waiting.thread.responderQueue?.entries.map((entry) => entry.botId)).toEqual([
      "bot-a",
      "bot-b",
    ]);
    expect(waiting.thread.updatedAt).toBe("2026-04-01T01:00:00.000Z");

    const emptied = applyThreadDetailEvent(
      waiting.thread,
      queueSet([], "2026-04-01T02:00:00.000Z"),
    );

    expect(emptied.kind).toBe("updated");

    if (emptied.kind !== "updated") return;

    expect(emptied.thread.responderQueue).toBeUndefined();
  });
});

describe("thread.responder-queue.set after the budget cut a chain", () => {
  it("keeps the emptied queue so the notice survives, until a later event replaces it", () => {
    const cut = applyThreadDetailEvent(baseThread, queueSet([], "2026-04-01T01:00:00.000Z", true));

    expect(cut.kind).toBe("updated");

    if (cut.kind !== "updated") return;

    expect(cut.thread.responderQueue).toMatchObject({ entries: [], budgetExhausted: true });

    const replaced = applyThreadDetailEvent(cut.thread, queueSet([], "2026-04-01T02:00:00.000Z"));

    expect(replaced.kind).toBe("updated");

    if (replaced.kind !== "updated") return;

    expect(replaced.thread.responderQueue).toBeUndefined();
  });
});

describe("thread.hop-budget-set", () => {
  it("records the chat's own budget", () => {
    const result = applyThreadDetailEvent(baseThread, {
      ...baseEventFields,
      sequence: 8,
      occurredAt: "2026-04-01T03:00:00.000Z",
      aggregateKind: "thread",
      aggregateId: ThreadId.make("thread-1"),
      type: "thread.hop-budget-set",
      payload: {
        threadId: ThreadId.make("thread-1"),
        hopBudget: 3,
        updatedAt: "2026-04-01T03:00:00.000Z",
      },
    });

    expect(result.kind).toBe("updated");

    if (result.kind !== "updated") return;

    expect(result.thread.hopBudget).toBe(3);
  });
});
