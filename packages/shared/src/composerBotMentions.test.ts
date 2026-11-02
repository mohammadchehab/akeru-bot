import { describe, expect, it } from "vite-plus/test";

import { serializeComposerBotMention } from "./composerInlineTokens.ts";
import {
  botReplyMentionText,
  composerBotMentionDetail,
  resolveComposerAddressing,
  resolveComposerBotMention,
} from "./composerBotMentions.ts";

const namesakes = [
  { id: "bot-1", name: "Mika" },
  { id: "bot-2", name: "Mika" },
  { id: "bot-3", name: "Mori" },
];

describe("resolveComposerBotMention", () => {
  it("routes the latest whole-word name", () => {
    expect(resolveComposerBotMention("@Mori then @Mika", namesakes.slice(1))).toEqual({
      kind: "bot",
      botId: "bot-2",
    });
    expect(resolveComposerBotMention("mail @Morisson", namesakes)).toEqual({ kind: "none" });
  });

  it("calls a bare shared name ambiguous", () => {
    expect(resolveComposerBotMention("hey @Mika", namesakes)).toEqual({
      kind: "ambiguous",
      name: "Mika",
    });
  });

  it("routes an id token to that exact bot, even when its name is shared", () => {
    expect(resolveComposerBotMention("hey @bot:bot-2 look", namesakes)).toEqual({
      kind: "bot",
      botId: "bot-2",
    });
    expect(resolveComposerBotMention("@Mori, ask @bot:bot-1", namesakes)).toEqual({
      kind: "bot",
      botId: "bot-1",
    });
    expect(resolveComposerBotMention("@bot:bot-1 then @Mori", namesakes)).toEqual({
      kind: "bot",
      botId: "bot-3",
    });
  });

  it("ignores an id token for a bot outside the list", () => {
    expect(resolveComposerBotMention("@bot:bot-9", namesakes)).toEqual({ kind: "none" });
  });
});

describe("composerBotMentionDetail", () => {
  it("tells two bots named Mika apart by title, then by short id", () => {
    const titled = [
      { id: "bot-claude-1", name: "Mika", title: "Designer" },
      { id: "bot-grok-2", name: "Mika", title: "Reviewer" },
      { id: "bot-3", name: "Mila", title: "Writer" },
    ];

    expect(titled.map((bot) => composerBotMentionDetail(bot, titled))).toEqual([
      "Designer",
      "Reviewer",
      null,
    ]);
    const sameTitle = titled.map((bot) => ({ ...bot, title: "Designer" }));
    expect(sameTitle.map((bot) => composerBotMentionDetail(bot, sameTitle))).toEqual([
      "#aude-1",
      "#grok-2",
      null,
    ]);
  });
});

describe("resolveComposerAddressing", () => {
  const bots = [
    { id: "bot-1", name: "Becky" },
    { id: "bot-2", name: "Omar" },
    { id: "bot-3", name: "Mika" },
    { id: "bot-4", name: "Mika" },
  ];

  it("keeps every mention in written order without duplicates", () => {
    expect(resolveComposerAddressing("@Omar and @Becky then @Omar again", bots)).toEqual({
      kind: "bots",
      botIds: ["bot-2", "bot-1"],
    });
  });

  it("reads @everyone as the whole group", () => {
    expect(resolveComposerAddressing("@everyone status?", bots)).toEqual({ kind: "everyone" });
    expect(resolveComposerAddressing("mail@everyone.com", bots)).toEqual({ kind: "none" });
  });

  it("routes an id token to an exact bot and flags a bare shared name", () => {
    expect(resolveComposerAddressing("@bot:bot-4 hi", bots)).toEqual({
      kind: "bots",
      botIds: ["bot-4"],
    });
    expect(resolveComposerAddressing("@Mika hi", bots)).toEqual({
      kind: "ambiguous",
      name: "Mika",
    });
  });

  it("is none when nobody is mentioned", () => {
    expect(resolveComposerAddressing("hello team", bots)).toEqual({ kind: "none" });
  });
});

describe("a mention followed by punctuation", () => {
  const bots = [
    { id: "bot-1", name: "Becky" },
    { id: "bot-2", name: "Mika" },
    { id: "bot-3", name: "Mika" },
  ];

  it.each([",", ".", ":", ";", "!", "?", ")"])("still resolves before %s", (mark) => {
    expect(resolveComposerAddressing(`(ask @Becky${mark} cheapest test)`, bots)).toEqual({
      kind: "bots",
      botIds: ["bot-1"],
    });
    expect(resolveComposerBotMention(`@Becky${mark} cheapest test`, bots)).toEqual({
      kind: "bot",
      botId: "bot-1",
    });
    expect(resolveComposerAddressing(`@everyone${mark} status`, bots)).toEqual({
      kind: "everyone",
    });
    expect(resolveComposerAddressing(`@Mika${mark} hi`, bots)).toEqual({
      kind: "ambiguous",
      name: "Mika",
    });
  });

  it("does not count a name that only starts the word", () => {
    expect(resolveComposerAddressing("@Beckyland, hi", bots)).toEqual({ kind: "none" });
  });
});

describe("an @bot:<id> mention followed by punctuation", () => {
  const bots = [
    { id: "bot-abc", name: "Becky" },
    { id: "a.b:c", name: "Odd" },
  ];

  it.each([",", ".", ";", ":", "!", "?", ")"])("resolves the id before %s", (mark) => {
    expect(resolveComposerAddressing(`ask @bot:bot-abc${mark} now`, bots)).toEqual({
      kind: "bots",
      botIds: ["bot-abc"],
    });
  });

  it("resolves at the end of the text and keeps inner marks in the id", () => {
    expect(resolveComposerAddressing("ask @bot:bot-abc", bots)).toEqual({
      kind: "bots",
      botIds: ["bot-abc"],
    });
    expect(resolveComposerAddressing("ask @bot:a.b:c.", bots)).toEqual({
      kind: "bots",
      botIds: ["a.b:c"],
    });
  });

  it("serializes only ids that start and end with a letter or digit", () => {
    expect(serializeComposerBotMention("a.b:c")).toBe("@bot:a.b:c");
    expect(serializeComposerBotMention("bot-1:")).toBeNull();
    expect(serializeComposerBotMention(".bot")).toBeNull();
  });
});

describe("the longest name at a position wins", () => {
  const bots = [
    { id: "bot-1", name: "Bo" },
    { id: "bot-2", name: "Bo Two" },
    { id: "bot-3", name: "Mika" },
    { id: "bot-4", name: "Mika" },
  ];

  it("reads '@Bo Two' as Bo Two, not as Bo", () => {
    expect(resolveComposerAddressing("@Bo Two please", bots)).toEqual({
      kind: "bots",
      botIds: ["bot-2"],
    });
    expect(resolveComposerAddressing("@Bo please", bots)).toEqual({
      kind: "bots",
      botIds: ["bot-1"],
    });
  });

  it("still calls two bots with the same longest name ambiguous", () => {
    expect(resolveComposerAddressing("@Mika hi", bots)).toEqual({
      kind: "ambiguous",
      name: "Mika",
    });
  });
});

describe("botReplyMentionText", () => {
  const bots = [
    { id: "bot-1", name: "Mori" },
    { id: "bot-2", name: "Omar" },
  ];

  const mentioned = (reply: string) => resolveComposerAddressing(botReplyMentionText(reply), bots);

  it("keeps a plain mention", () => {
    expect(mentioned("Over to @Mori.")).toEqual({ kind: "bots", botIds: ["bot-1"] });
  });

  it("ignores a mention inside inline code or a code block", () => {
    expect(mentioned("Run `@Mori` to see it")).toEqual({ kind: "none" });
    expect(mentioned("```\n@Mori ping\n```\nDone.")).toEqual({ kind: "none" });
    expect(mentioned("```text\n@Mori ping")).toEqual({ kind: "none" });
  });

  it("ignores a mention in a quoted line, such as the user's message echoed back", () => {
    expect(mentioned("> @Mori check this\nNoted.")).toEqual({ kind: "none" });
    expect(mentioned("You wrote:\n  > @Mori check this\n@Omar, thoughts?")).toEqual({
      kind: "bots",
      botIds: ["bot-2"],
    });
  });

  it("does not let a bot address everyone, but still reads the bots it names", () => {
    expect(mentioned("@everyone status?")).toEqual({ kind: "none" });
    expect(mentioned("@everyone, @Mori check")).toEqual({ kind: "bots", botIds: ["bot-1"] });
  });
});
