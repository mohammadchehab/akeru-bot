/** The "Becky is next" line for the bots still waiting to answer, or null when nobody waits. */
export function responderQueueLine(
  queue: { readonly entries: ReadonlyArray<{ readonly botId: string }> } | null | undefined,
  bots: ReadonlyArray<{ readonly id: string; readonly name: string }>,
): string | null {
  const names = (queue?.entries ?? []).flatMap((entry) => {
    const bot = bots.find((candidate) => candidate.id === entry.botId);

    return bot ? [bot.name] : [];
  });

  if (names.length === 0) return null;

  return `${names.join(", ")} ${names.length === 1 ? "is" : "are"} next`;
}
