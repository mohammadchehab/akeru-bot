import type { EnvironmentId, ThreadId } from "@isnadi/contracts";

import type { EnvironmentThreadShell } from "./state/models.ts";

export type DecisionKind = "approval" | "question";

/** One chat where a bot is waiting on the user, owned by a bot or a group. */
export interface Decision {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  /** The chat that holds the prompt: the pending chat itself, which may be a delegated sub-chat. */
  readonly targetThreadId: ThreadId;
  readonly botId: string | null;
  readonly groupId: string | null;
  readonly title: string;
  readonly kind: DecisionKind;
  readonly updatedAt: string;
}

function pendingKind(shell: EnvironmentThreadShell): DecisionKind | null {
  if (shell.hasPendingApprovals) return "approval";

  return shell.hasPendingUserInput ? "question" : null;
}

function rootOf(
  shell: EnvironmentThreadShell,
  byId: ReadonlyMap<ThreadId, EnvironmentThreadShell>,
): EnvironmentThreadShell | null {
  const seen = new Set<ThreadId>();
  let current = shell;

  while (current.parentThreadId != null) {
    if (seen.has(current.id)) return null;

    seen.add(current.id);
    const parent = byId.get(current.parentThreadId);

    if (parent === undefined) return null;

    current = parent;
  }

  return current;
}

/**
 * Chats in the primary environment that wait on the user for an approval or a question,
 * newest first. A delegated sub-chat stands for its root chat, so one row covers the tree;
 * an approval outranks a question when both are pending anywhere in it. `targetThreadId` is
 * the chat to open: the newest pending approval in the tree, otherwise the newest question.
 */
export function selectDecisions(
  shells: ReadonlyArray<EnvironmentThreadShell>,
  primaryEnvironmentId: EnvironmentId | null,
): ReadonlyArray<Decision> {
  if (primaryEnvironmentId === null) return [];

  const byId = new Map<ThreadId, EnvironmentThreadShell>();

  for (const shell of shells) {
    if (shell.environmentId === primaryEnvironmentId) byId.set(shell.id, shell);
  }

  const byRoot = new Map<ThreadId, Decision>();
  const targetUpdatedAt = new Map<ThreadId, string>();

  for (const shell of byId.values()) {
    const kind = pendingKind(shell);

    if (kind === null || shell.archivedAt !== null) continue;

    const root = rootOf(shell, byId);

    if (root === null || root.archivedAt !== null) continue;

    if (root.botId == null && root.groupId == null) continue;

    const existing = byRoot.get(root.id);

    const supersedes =
      existing === undefined ||
      (kind === "approval" && existing.kind !== "approval") ||
      (kind === existing.kind && shell.updatedAt > (targetUpdatedAt.get(root.id) ?? ""));

    if (supersedes) targetUpdatedAt.set(root.id, shell.updatedAt);

    byRoot.set(root.id, {
      environmentId: root.environmentId,
      threadId: root.id,
      targetThreadId: supersedes ? shell.id : existing.targetThreadId,
      botId: root.botId ?? null,
      groupId: root.groupId ?? null,
      title: root.title,
      kind: existing?.kind === "approval" ? "approval" : kind,
      updatedAt:
        existing !== undefined && existing.updatedAt > shell.updatedAt
          ? existing.updatedAt
          : shell.updatedAt,
    });
  }

  return [...byRoot.values()].toSorted(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) || left.threadId.localeCompare(right.threadId),
  );
}

/** Equal when the rows a sidebar renders are equal; timestamps only matter through order. */
export function decisionsEqual(
  left: ReadonlyArray<Decision>,
  right: ReadonlyArray<Decision>,
): boolean {
  return (
    left.length === right.length &&
    left.every((row, index) => {
      const other = right[index];

      return (
        other !== undefined &&
        row.environmentId === other.environmentId &&
        row.threadId === other.threadId &&
        row.targetThreadId === other.targetThreadId &&
        row.kind === other.kind &&
        row.title === other.title &&
        row.botId === other.botId &&
        row.groupId === other.groupId
      );
    })
  );
}
