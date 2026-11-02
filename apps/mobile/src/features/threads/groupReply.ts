/** The bot message a group send replies to, held while the composer shows its chip. */
export interface GroupReplyTarget {
  readonly messageId: string;
  readonly botId: string;
  readonly botName: string;
  readonly snippet: string;
}

const SNIPPET_LENGTH = 80;

/** One line of the message, cut short, for the composer chip. */
export function replySnippet(text: string): string {
  const line =
    text
      .split("\n")
      .map((part) => part.trim())
      .find((part) => part.length > 0) ?? "";

  return line.length > SNIPPET_LENGTH ? `${line.slice(0, SNIPPET_LENGTH - 1)}…` : line;
}

/**
 * The reply target a long-press on a message offers: only a bot's message in a group chat,
 * and only when the server knows which bot wrote it (older messages and direct chats do not).
 */
export function groupReplyTarget(input: {
  readonly isGroup: boolean;
  readonly message: {
    readonly id: string;
    readonly role: string;
    readonly text: string;
    readonly respondingBotId?: string | null | undefined;
  };
  readonly botName: string;
}): GroupReplyTarget | null {
  const { message } = input;

  if (!input.isGroup || message.role !== "assistant" || !message.respondingBotId) return null;

  return {
    messageId: message.id,
    botId: message.respondingBotId,
    botName: input.botName,
    snippet: replySnippet(message.text),
  };
}

export interface MessageLink {
  readonly href: string;
  readonly host: string;
}

const MAX_LINK_ACTIONS = 3;

const MARKDOWN_LINK = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;

const BARE_URL = /https?:\/\/[^\s)<>\]]+/g;

/** The first few distinct http(s) links in a message's markdown, in reading order. */
export function extractMessageLinks(markdown: string): MessageLink[] {
  const found: Array<{ index: number; href: string }> = [];

  for (const match of markdown.matchAll(MARKDOWN_LINK)) {
    found.push({ index: match.index, href: match[1] ?? "" });
  }

  // A bare URL already inside a `[text](url)` match must not count twice.
  const taken = Array.from(markdown.matchAll(MARKDOWN_LINK), (m) => [
    m.index,
    m.index + m[0].length,
  ]);

  for (const match of markdown.matchAll(BARE_URL)) {
    if (!taken.some(([start, end]) => match.index >= (start ?? 0) && match.index < (end ?? 0))) {
      found.push({ index: match.index, href: match[0].replace(/[.,;:!?]+$/, "") });
    }
  }

  const links: MessageLink[] = [];

  // Plain sort and a regex host: Hermes lacks toSorted, URL.canParse and a working URL.host.
  for (const { href } of [...found].sort((a, b) => a.index - b.index)) {
    if (links.some((link) => link.href === href)) continue;
    const host = /^https?:\/\/([^/?#]+)/.exec(href)?.[1] ?? href;
    links.push({ href, host });

    if (links.length === MAX_LINK_ACTIONS) break;
  }

  return links;
}

export interface MessageAction {
  readonly name: string;
  readonly label: string;
}

/**
 * The accessibility actions of one group bot message: Reply when it can be replied to, Copy, and
 * one "Open <host>" per link (at most three). The message stays a single accessibility element.
 */
export function groupMessageActions(input: {
  readonly canReply: boolean;
  readonly text: string;
  readonly labels: {
    readonly reply: string;
    readonly copy: string;
    readonly openLink: (host: string) => string;
  };
}): MessageAction[] {
  const links = extractMessageLinks(input.text);

  return [
    ...(input.canReply ? [{ name: "reply", label: input.labels.reply }] : []),
    { name: "copy", label: input.labels.copy },
    ...links.map((link, index) => ({
      name: `open-link:${index}`,
      label: input.labels.openLink(link.host),
    })),
  ];
}

/** Runs a sheet choice. Copy puts the message's markdown source on the clipboard. */
export function runGroupMessageAction(
  action: "reply" | "copy",
  input: {
    readonly target: GroupReplyTarget | null;
    readonly text: string;
    readonly onReply: (target: GroupReplyTarget) => void;
    readonly copy: (text: string) => void;
  },
): void {
  if (action === "copy") input.copy(input.text);
  else if (input.target) input.onReply(input.target);
}
