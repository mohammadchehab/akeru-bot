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
