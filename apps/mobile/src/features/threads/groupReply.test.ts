import { describe, expect, it } from "vite-plus/test";

import { groupReplyTarget, replySnippet } from "./groupReply";

const message = { id: "m-1", role: "assistant", text: "Hello there", respondingBotId: "bot-1" };

describe("groupReplyTarget", () => {
  it("offers a reply on a bot message in a group", () => {
    expect(groupReplyTarget({ isGroup: true, message, botName: "Becky" })).toEqual({
      messageId: "m-1",
      botId: "bot-1",
      botName: "Becky",
      snippet: "Hello there",
    });
  });

  it("offers nothing for user messages, unattributed messages or direct chats", () => {
    expect(
      groupReplyTarget({ isGroup: true, message: { ...message, role: "user" }, botName: "B" }),
    ).toBeNull();

    expect(
      groupReplyTarget({
        isGroup: true,
        message: { ...message, respondingBotId: undefined },
        botName: "B",
      }),
    ).toBeNull();

    expect(groupReplyTarget({ isGroup: false, message, botName: "B" })).toBeNull();
  });
});

describe("replySnippet", () => {
  it("keeps the first non-empty line and cuts a long one", () => {
    expect(replySnippet("\n  first\nsecond")).toBe("first");
    expect(replySnippet("x".repeat(100))).toHaveLength(80);
  });
});
