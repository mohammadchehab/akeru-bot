import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/unstable/reactivity";

import type { GroupReplyTarget } from "../features/threads/groupReply";
import { appAtomRegistry } from "./atom-registry";

/** The reply chip's target per chat. In memory only: it is not part of the draft and never persists. */
const groupReplyTargetsAtom = Atom.make<Readonly<Record<string, GroupReplyTarget>>>({}).pipe(
  Atom.keepAlive,
);

export function getGroupReplyTarget(threadKey: string): GroupReplyTarget | null {
  return appAtomRegistry.get(groupReplyTargetsAtom)[threadKey] ?? null;
}

export function setGroupReplyTarget(threadKey: string, target: GroupReplyTarget | null): void {
  const current = appAtomRegistry.get(groupReplyTargetsAtom);

  if (target === null) {
    if (!(threadKey in current)) return;
    const { [threadKey]: _removed, ...rest } = current;
    appAtomRegistry.set(groupReplyTargetsAtom, rest);

    return;
  }

  appAtomRegistry.set(groupReplyTargetsAtom, { ...current, [threadKey]: target });
}

export function useGroupReplyTarget(threadKey: string): GroupReplyTarget | null {
  return useAtomValue(groupReplyTargetsAtom)[threadKey] ?? null;
}

/**
 * Puts the reply chip back after a send failed to save: the draft returns to the composer, so the
 * chip that went with it must too. Does nothing when the send carried no reply.
 */
export function restoreGroupReplyTargetAfterFailedSend(
  threadKey: string,
  chipTarget: GroupReplyTarget | null,
  sentAsReply: boolean,
): void {
  if (chipTarget && sentAsReply) setGroupReplyTarget(threadKey, chipTarget);
}
