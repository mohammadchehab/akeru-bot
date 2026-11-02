import { BotId, MessageId, type GroupAddressing } from "@isnadi/contracts";
import { collectComposerInlineTokens } from "./composerInlineTokens.ts";

export interface ComposerMentionBot {
  readonly id: string;
  readonly name: string;
}

/**
 * What tells a bot apart from others with the same name in a mention menu: its
 * title, or a short id when the namesakes share that too. Null for a unique name.
 */
export function composerBotMentionDetail(
  bot: ComposerMentionBot & { readonly title?: string },
  bots: ReadonlyArray<ComposerMentionBot & { readonly title?: string }>,
): string | null {
  const namesakes = bots.filter((other) => other.name === bot.name);

  if (namesakes.length < 2) return null;
  const title = bot.title?.trim() ?? "";

  const titleIsUnique =
    title.length > 0 && namesakes.filter((other) => other.title?.trim() === title).length === 1;

  return titleIsUnique ? title : `#${bot.id.slice(-6)}`;
}

/**
 * A mention runs to the first character that cannot be part of a member name, so whitespace,
 * the end of the text, or one of `, . : ; ! ? )` ends it and it still resolves.
 */
export function endsMention(after: string | undefined): boolean {
  return after === undefined || /[\s,.:;!?)]/.test(after);
}

export type ComposerBotMention =
  | { readonly kind: "none" }
  | { readonly kind: "bot"; readonly botId: string }
  | { readonly kind: "ambiguous"; readonly name: string };

/**
 * The bot a group prompt is addressed to: the latest whole-word `@Name`, or an
 * `@bot:<id>` token for one of two bots that share a name. A bare name shared by
 * two bots cannot be routed honestly, so it resolves as ambiguous.
 */
export function resolveComposerBotMention(
  prompt: string,
  bots: ReadonlyArray<ComposerMentionBot>,
): ComposerBotMention {
  const mentions: Array<{
    readonly bot: ComposerMentionBot;
    readonly index: number;
    readonly byId: boolean;
  }> = [];

  for (const bot of bots) {
    const token = `@${bot.name}`;
    const index = prompt.lastIndexOf(token);

    if (index < 0) continue;
    const before = prompt[index - 1];
    const after = prompt[index + token.length];

    if ((before === undefined || /\s/.test(before)) && endsMention(after)) {
      mentions.push({ bot, index, byId: false });
    }
  }

  for (const token of collectComposerInlineTokens(`${prompt}\n`)) {
    if (token.type !== "bot-mention") continue;
    const bot = bots.find((candidate) => candidate.id === token.value);

    if (bot) mentions.push({ bot, index: token.start, byId: true });
  }

  let latest: (typeof mentions)[number] | undefined;

  for (const mention of mentions) {
    if (
      !latest ||
      mention.index > latest.index ||
      (mention.index === latest.index && mention.bot.name.length > latest.bot.name.length)
    ) {
      latest = mention;
    }
  }

  if (!latest) return { kind: "none" };

  if (latest.byId) return { kind: "bot", botId: latest.bot.id };
  const name = latest.bot.name;
  const namesakes = bots.filter((bot) => bot.name === name);

  return namesakes.length > 1 ? { kind: "ambiguous", name } : { kind: "bot", botId: latest.bot.id };
}

export type ComposerAddressing =
  | { readonly kind: "none" }
  | { readonly kind: "everyone" }
  | { readonly kind: "bots"; readonly botIds: readonly [string, ...string[]] }
  | { readonly kind: "ambiguous"; readonly name: string };

/** An addressing a send can carry: every shape except the ambiguous name the caller blocks. */
export type SendableComposerAddressing = Exclude<
  ComposerAddressing,
  { readonly kind: "ambiguous" }
>;

const EVERYONE_TOKEN = /(^|\s)@everyone(?=[\s,.:;!?)]|$)/;

/**
 * Who a group prompt is for (docs/internals/group-chats.md, "Addressing"): `@everyone`, or every
 * whole-word `@Name` / `@bot:<id>` mention in the order written, duplicates removed. A bare name
 * shared by two bots cannot be routed honestly, so it resolves as ambiguous. A prompt that
 * mentions nobody is `none`: the caller sends no addressing and the server routes it.
 */
export function resolveComposerAddressing(
  prompt: string,
  bots: ReadonlyArray<ComposerMentionBot>,
): ComposerAddressing {
  if (EVERYONE_TOKEN.test(prompt)) return { kind: "everyone" };

  const found: Array<{ readonly index: number; readonly botId: string }> = [];
  const byName: Array<{ readonly index: number; readonly bot: ComposerMentionBot }> = [];

  for (const bot of bots) {
    const token = `@${bot.name}`;

    for (let from = prompt.indexOf(token); from >= 0; from = prompt.indexOf(token, from + 1)) {
      const before = prompt[from - 1];
      const after = prompt[from + token.length];

      if ((before === undefined || /\s/.test(before)) && endsMention(after)) {
        byName.push({ index: from, bot });
      }
    }
  }

  // Where one name is the start of another ("Bo" and "Bo Two"), the longest name at a position
  // is the one meant. Only then can two bots at that position be namesakes: they share the name.
  const positions = new Set(byName.map((mention) => mention.index));

  for (const index of positions) {
    const here = byName.filter((mention) => mention.index === index);
    const longest = Math.max(...here.map((mention) => mention.bot.name.length));
    const winners = here.filter((mention) => mention.bot.name.length === longest);
    const [winner] = winners;

    if (winner === undefined) continue;

    if (winners.length > 1) return { kind: "ambiguous", name: winner.bot.name };
    found.push({ index, botId: winner.bot.id });
  }

  for (const token of collectComposerInlineTokens(`${prompt}\n`)) {
    if (token.type !== "bot-mention") continue;

    if (bots.some((bot) => bot.id === token.value)) {
      found.push({ index: token.start, botId: token.value });
    }
  }

  found.sort((a, b) => a.index - b.index);
  const botIds = [...new Set(found.map((mention) => mention.botId))];
  const [first, ...rest] = botIds;

  return first === undefined ? { kind: "none" } : { kind: "bots", botIds: [first, ...rest] };
}

const FENCED_CODE = /(```|~~~)[\s\S]*?(\1|$)/g;

const INLINE_CODE = /`[^`\n]*`/g;

const QUOTED_LINE = /^[ \t]*>.*$/gm;

const EVERYONE_MENTION = /(^|\s)@everyone(?=[\s,.:;!?)]|$)/g;

/**
 * What of a bot's reply may hand the chat to another member. A mention in code, a code block or a
 * quoted line is not addressed to anyone (a bot echoing the user's "@Mori ..." must not re-queue
 * Mori), and bots cannot address `@everyone`. Feed the result to `resolveComposerAddressing`.
 */
export function botReplyMentionText(reply: string): string {
  return reply
    .replace(FENCED_CODE, " ")
    .replace(INLINE_CODE, " ")
    .replace(QUOTED_LINE, " ")
    .replace(EVERYONE_MENTION, "$1");
}

/**
 * The wire addressing for what the composer resolved. Ambiguous names are not accepted: callers
 * block the send first. A reply goes to the bot that wrote the quoted message, unless the prompt
 * names someone itself. A quoted message with no `respondingBotId` (older group messages, rows
 * a person wrote) has no bot to answer it, so the quote stays and the server routes the send.
 */
export function groupAddressing(
  addressing: SendableComposerAddressing | undefined,
  replyTo?: { readonly messageId: string; readonly respondingBotId?: string | null | undefined },
): GroupAddressing | undefined {
  if (addressing?.kind === "everyone") return { kind: "everyone" };

  if (addressing?.kind === "bots") {
    const [first, ...rest] = addressing.botIds;

    return { kind: "bots", botIds: [BotId.make(first), ...rest.map((id) => BotId.make(id))] };
  }

  if (replyTo?.respondingBotId) {
    return { kind: "reply", messageId: MessageId.make(replyTo.messageId) };
  }

  return undefined;
}
