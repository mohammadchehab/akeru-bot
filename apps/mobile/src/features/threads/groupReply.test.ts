import { describe, expect, it } from "vite-plus/test";

import {
  extractMessageLinks,
  groupMessageActions,
  groupReplyTarget,
  replySnippet,
  runGroupMessageAction,
} from "./groupReply";

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

const labels = {
  reply: "Reply",
  copy: "Copy",
  openLink: (host: string) => `Open ${host}`,
};

describe("groupMessageActions", () => {
  it("offers Reply and Copy for a message with no links", () => {
    expect(groupMessageActions({ canReply: true, text: "plain", labels })).toEqual([
      { name: "reply", label: "Reply" },
      { name: "copy", label: "Copy" },
    ]);
  });

  it("drops Reply when the message cannot be replied to", () => {
    expect(
      groupMessageActions({ canReply: false, text: "plain", labels }).map((a) => a.name),
    ).toEqual(["copy"]);
  });

  it("adds one Open action for a link", () => {
    expect(
      groupMessageActions({
        canReply: true,
        text: "See [notes](https://example.com/a) now",
        labels,
      }),
    ).toEqual([
      { name: "reply", label: "Reply" },
      { name: "copy", label: "Copy" },
      { name: "open-link:0", label: "Open example.com" },
    ]);
  });

  it("caps the link actions at three, in reading order, without duplicates", () => {
    const text =
      "https://a.test/1 and [b](https://b.test/2) and https://a.test/1 and https://c.test/3, https://d.test/4";

    expect(extractMessageLinks(text).map((link) => link.host)).toEqual([
      "a.test",
      "b.test",
      "c.test",
    ]);

    expect(
      groupMessageActions({ canReply: true, text, labels }).filter((a) =>
        a.name.startsWith("open-link:"),
      ),
    ).toHaveLength(3);
  });
});

describe("runGroupMessageAction", () => {
  const target = { messageId: "m-1", botId: "bot-1", botName: "Becky", snippet: "Hello" };

  it("copies the message's markdown source", () => {
    const copied: string[] = [];

    runGroupMessageAction("copy", {
      target,
      text: "**bold** [link](https://example.com)",
      onReply: () => undefined,
      copy: (text) => copied.push(text),
    });

    expect(copied).toEqual(["**bold** [link](https://example.com)"]);
  });

  it("replies with the target, and does nothing without one", () => {
    const replies: string[] = [];
    const onReply = (chosen: { messageId: string }) => replies.push(chosen.messageId);

    runGroupMessageAction("reply", { target, text: "x", onReply, copy: () => undefined });
    runGroupMessageAction("reply", { target: null, text: "x", onReply, copy: () => undefined });
    expect(replies).toEqual(["m-1"]);
  });
});
