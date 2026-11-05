import {
  ISNADI_TOOL_CATALOG,
  BotId,
  DelegationId,
  MessageId,
  ProviderInstanceId,
  ThreadId,
  type IsnadiDelegationAccessGrant,
  IsnadiDelegationPhase,
  type IsnadiDelegationRecord,
  type OrchestrationBot,
  type OrchestrationCommand,
  type OrchestrationReadModel,
  TurnId,
  isGroupBotMember,
} from "@isnadi/contracts";
import * as Schema from "effect/Schema";
import { PendingWaiterTimeoutError } from "../PendingWaiters.ts";

export const isPendingWaiterTimeout = Schema.is(PendingWaiterTimeoutError);

const botRefs = (bots: ReadonlyArray<{ readonly id: string; readonly name: string }>) =>
  bots.map((bot) => `${bot.name} (${bot.id})`).join(", ");

const BotRefs = Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String }));

/** A bot tool named a target that is neither a bot ID nor a member name or label. */
export class IsnadiDelegationUnknownBotError extends Schema.TaggedErrorClass<IsnadiDelegationUnknownBotError>()(
  "IsnadiDelegationUnknownBotError",
  { requested: Schema.String, members: BotRefs },
) {
  override get message(): string {
    return `No bot with the ID or name '${this.requested}' is available here. Pass a bot ID or exact name. Valid members: ${botRefs(this.members) || "none"}.`;
  }
}

/** A bot tool named a target that matches several members; it never picks one. */
export class IsnadiDelegationAmbiguousBotError extends Schema.TaggedErrorClass<IsnadiDelegationAmbiguousBotError>()(
  "IsnadiDelegationAmbiguousBotError",
  { requested: Schema.String, candidates: BotRefs },
) {
  override get message(): string {
    return `More than one bot matches '${this.requested}': ${botRefs(this.candidates)}. Pass the bot ID of the one you mean.`;
  }
}

export const isUnknownDelegationBot = Schema.is(IsnadiDelegationUnknownBotError);

export const isAmbiguousDelegationBot = Schema.is(IsnadiDelegationAmbiguousBotError);

export const TERMINAL_PHASES = new Set<IsnadiDelegationPhase["_tag"]>([
  "Completed",
  "Failed",
  "Canceled",
]);

export const phaseChildThreadId = (delegation: IsnadiDelegationRecord): ThreadId | null =>
  IsnadiDelegationPhase.guards.Queued(delegation.phase) ? null : delegation.phase.childThreadId;

export const phaseChildTurnId = (delegation: IsnadiDelegationRecord): TurnId | null =>
  IsnadiDelegationPhase.guards.Queued(delegation.phase) ? null : delegation.phase.childTurnId;

export const phaseStartedAt = (delegation: IsnadiDelegationRecord): string | null =>
  IsnadiDelegationPhase.guards.Queued(delegation.phase) ? null : delegation.phase.startedAt;

/**
 * The user message that started the parent turn, so clients can place the work
 * card under it. Null when the turn has no recorded request message; clients
 * then fall back to parentTurnId.
 */
export const parentTurnRequestMessageId = (
  thread: OrchestrationReadModel["threads"][number],
  turnId: TurnId,
): MessageId | null =>
  thread.latestTurn?.turnId === turnId ? (thread.latestTurn.requestMessageId ?? null) : null;

export interface IsnadiDelegationParent {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly botId: BotId;
  readonly parentDelegationId: DelegationId | null;
  readonly ancestorBotIds: ReadonlyArray<BotId>;
  readonly depth: number;
  readonly access: IsnadiDelegationAccessGrant;
}

export interface IsnadiDelegationChildOutcome {
  readonly state: "completed" | "failed" | "blocked";
  readonly turnId: TurnId | null;
  readonly summary?: string;
  readonly error?: string;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
  };
}

export interface IsnadiDelegationRuntimeOptions {
  readonly readSnapshot: () => Promise<OrchestrationReadModel>;
  readonly dispatch: (
    command: OrchestrationCommand,
  ) => Promise<{ readonly sequence: number } | void>;
  /**
   * Resolves with the child's turn outcome. Rejects with
   * `PendingWaiterTimeoutError` at the deadline, or after a bounded default
   * when the deadline is null, so a silent child never hangs the watch.
   */
  readonly awaitChild: (
    threadId: ThreadId,
    deadline: string | null,
  ) => Promise<IsnadiDelegationChildOutcome>;
  readonly interruptChild: (threadId: ThreadId, turnId: TurnId | null) => Promise<void>;
  readonly recordUsage?: (input: {
    readonly botId: BotId;
    readonly threadId: ThreadId;
    readonly turnId: TurnId | null;
    readonly category: "delegated";
    readonly inputTokens: number;
    readonly outputTokens: number;
  }) => Promise<void>;
  /**
   * Driver kind behind a provider instance, or null when the instance is
   * unknown. SendToAgent refuses a target whose instance is unknown or whose
   * driver cannot run delegated work before it creates the child thread.
   */
  readonly providerDriverKind?: (instanceId: ProviderInstanceId) => Promise<string | null>;
  /** Reports a background child watch that could not record its outcome. */
  readonly onWatchError?: (delegationId: DelegationId, cause: unknown) => void;
  /**
   * Reports a completed result the group chat did not show because the child
   * bot is no longer an active member or the group is gone. The result stays
   * recorded and reaches the parent on its next turn.
   */
  readonly onGroupResultSkipped?: (
    delegationId: DelegationId,
    reason: IsnadiGroupResultSkipReason,
  ) => void;
  readonly now?: () => string;
  readonly id?: () => string;
}

/**
 * Bot work started without a live parent turn. `Retry` repeats a Failed or
 * Canceled record; `Scheduled` is a routine run handing work from the owner
 * chat to another bot.
 */
export type IsnadiDelegationDispatch =
  | { readonly _tag: "Retry"; readonly delegationId: DelegationId }
  | {
      readonly _tag: "Scheduled";
      readonly parentThreadId: ThreadId;
      readonly parentBotId: BotId;
      readonly childBotId: BotId;
      readonly task: string;
      readonly expectedResult: string;
      readonly runtimeMode: IsnadiDelegationAccessGrant["runtimeMode"];
    };

/** How a record was started, when not by a bot tool call inside a live turn. */
export interface IsnadiDelegationOrigin {
  readonly trigger: IsnadiDelegationRecord["trigger"];
  readonly retryOfDelegationId: DelegationId | null;
  readonly anchorMessageId: MessageId | null;
}

export const isDispatchedDelegation = (delegation: IsnadiDelegationRecord) =>
  delegation.trigger !== "bot" || delegation.retryOfDelegationId !== null;

/** Why a group chat did not receive a finished delegation's result message. */
export type IsnadiGroupResultSkipReason = "bot_left_group" | "group_unavailable";

/** Returned by SendToAgent and MessageAgent as soon as the child turn is dispatched. */
export interface IsnadiDelegationHandle {
  readonly delegationId: DelegationId;
  readonly childThreadId: ThreadId;
  readonly childBotId: BotId;
  readonly name: string;
  readonly phase: "running";
}

// The child offers every memory scope; intersectDelegationAccess narrows it to
// what the parent holds and the request names, so an omitted request grants none.
export function childAccess(
  bot: OrchestrationBot,
  parentMcpServerIds: ReadonlyArray<IsnadiDelegationAccessGrant["enabledMcpServerIds"][number]>,
  requestedMemoryScopes: IsnadiDelegationAccessGrant["memoryScopes"] | undefined,
): IsnadiDelegationAccessGrant {
  return {
    allowedToolIds: ISNADI_TOOL_CATALOG.map((tool) => tool.id),
    memoryScopes: requestedMemoryScopes ?? [],
    sandbox: bot.sandbox,
    runtimeMode: bot.runtimeMode,
    hasUserComputer: bot.sandbox === "local",
    enabledMcpServerIds: parentMcpServerIds.filter(
      (serverId) => !bot.disabledMcpServerIds.includes(serverId),
    ),
    disabledMcpServerIds: bot.disabledMcpServerIds,
    approvalCeiling: "secrets",
  };
}

/**
 * A bot can take work from a group chat only when it is a member of that
 * group. A bot may belong to several groups, so membership is read from the
 * group, not from the bot's legacy `groupId`. A direct chat can reach any bot.
 */
export function isReachableFromThread(
  snapshot: OrchestrationReadModel,
  parentThread: OrchestrationReadModel["threads"][number],
  bot: OrchestrationBot,
): boolean {
  if (parentThread.groupId === null) return true;
  const group = snapshot.groups.find((candidate) => candidate.id === parentThread.groupId);

  return (
    group !== undefined &&
    group.members.some((member) => isGroupBotMember(member) && member.botId === bot.id)
  );
}

export function childInstructions(input: {
  readonly task: string;
  readonly expectedResult: string;
  readonly deadline: string | null;
  readonly context: string | undefined;
}): string {
  return [
    "This work was delegated from another bot chat.",
    `Task: ${input.task}`,
    `Expected result: ${input.expectedResult}`,
    ...(input.deadline ? [`Deadline: ${input.deadline}`] : []),
    ...(input.context?.trim() ? ["Context from the parent bot:", input.context.trim()] : []),
    "Return a concise final result to the parent chat. Report a concrete blocker or failure.",
  ].join("\n");
}

const sameText = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;

/**
 * Resolves the bot a delegation tool names. An exact bot ID wins; otherwise the
 * text is an exact name, then an exact label, matched only among active bots
 * reachable from the parent thread (never the calling bot), so a name never
 * reveals a bot outside the group. Several matches fail rather than pick one.
 * Returns the requested ID unchanged when it is a known bot, so the caller's
 * archived and group checks still give their own errors.
 */
export function resolveDelegationTargetId(
  snapshot: OrchestrationReadModel,
  parent: Pick<IsnadiDelegationParent, "threadId" | "botId">,
  requested: BotId,
): BotId {
  if (snapshot.bots.some((candidate) => candidate.id === requested)) return requested;

  const parentThread = snapshot.threads.find((thread) => thread.id === parent.threadId);

  if (!parentThread) return requested;

  const members = snapshot.bots.filter(
    (candidate) =>
      candidate.archivedAt === null &&
      candidate.id !== parent.botId &&
      isReachableFromThread(snapshot, parentThread, candidate),
  );

  const text = requested.trim().replace(/^@/, "");

  for (const field of ["name", "label"] as const) {
    const matches = members.filter((candidate) => {
      const value = candidate[field];

      return value !== null && sameText(value, text);
    });

    if (matches.length > 1) {
      throw new IsnadiDelegationAmbiguousBotError({
        requested,
        candidates: matches.map((match) => ({ id: match.id, name: match.name })),
      });
    }

    if (matches[0]) return matches[0].id;
  }

  throw new IsnadiDelegationUnknownBotError({
    requested,
    members: members.map((member) => ({ id: member.id, name: member.name })),
  });
}
