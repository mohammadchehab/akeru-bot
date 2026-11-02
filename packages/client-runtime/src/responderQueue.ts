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

/**
 * What Stop ends in a chat: the running turn, and the bots still queued behind it. Null when
 * nothing runs and nobody waits. Between hops the session is ready but the queue is not empty,
 * so Stop still applies; the interrupt then carries no turn id.
 */
export function stopTarget<TurnIdType>(thread: {
  readonly session?:
    | {
        readonly status: string;
        readonly activeTurnId?: TurnIdType | null | undefined;
      }
    | null
    | undefined;
  readonly responderQueue?:
    | {
        readonly entries: ReadonlyArray<unknown>;
      }
    | null
    | undefined;
}): { readonly turnId?: TurnIdType } | null {
  const session = thread.session;
  const running = session?.status === "running" || session?.status === "starting";

  if (!running && !thread.responderQueue?.entries.length) return null;

  return running && session?.activeTurnId ? { turnId: session.activeTurnId } : {};
}
