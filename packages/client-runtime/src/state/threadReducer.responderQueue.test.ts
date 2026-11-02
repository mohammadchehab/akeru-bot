import { BotId, MessageId, ThreadId, type OrchestrationEvent } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { applyThreadDetailEvent } from "./threadReducer.ts";
import { baseEventFields, baseThread } from "./threadReducer.test-support.ts";

const queueSet = (
  entries: ReadonlyArray<string>,
  updatedAt = "2026-04-01T01:00:00.000Z",
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
    hopsLeft: 6,
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
