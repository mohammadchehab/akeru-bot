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

  for (const bot of bots) {
    const token = `@${bot.name}`;
    const namesakes = bots.filter((other) => other.name === bot.name);

    for (let from = prompt.indexOf(token); from >= 0; from = prompt.indexOf(token, from + 1)) {
      const before = prompt[from - 1];
      const after = prompt[from + token.length];

      if ((before === undefined || /\s/.test(before)) && endsMention(after)) {
        if (namesakes.length > 1) return { kind: "ambiguous", name: bot.name };
        found.push({ index: from, botId: bot.id });
      }
    }
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
