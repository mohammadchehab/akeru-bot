export interface ResponderQueueMember {
  readonly id: string;
  readonly name: string;
}

/** Names of the bots still waiting to answer, in queue order. Entries for unknown bots are skipped. */
export function responderQueueNames(
  queue: { readonly entries: ReadonlyArray<{ readonly botId: string }> } | null | undefined,
  members: ReadonlyArray<ResponderQueueMember>,
): string[] {
  return (queue?.entries ?? []).flatMap((entry) => {
    const member = members.find((candidate) => candidate.id === entry.botId);

    return member ? [member.name] : [];
  });
}

/** The "Becky is next" line for the bots still waiting to answer, or null when nobody waits. */
export function responderQueueLine(
  names: readonly string[],
  t: (message: string, params?: Readonly<Record<string, string | number>>) => string,
): string | null {
  if (names.length === 0) return null;
  const joined = names.join(", ");

  return names.length === 1
    ? t("{names} is next", { names: joined })
    : t("{names} are next", { names: joined });
}
