import {
  type BotId,
  ThreadId,
  type IsnadiDelegationRecord,
  type OrchestrationBot,
  type OrchestrationGroup,
  isGroupBotMember,
  isGroupPersonMember,
} from "@isnadi/contracts";

import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { type GroupConversationState } from "../../mastra/IsnadiGroupConversation.ts";
import { isWorkerThreadId } from "../../IsnadiWorkerRuntime.ts";

import type { SessionLifecycleDependencies } from "./SessionLifecycleDependencies.ts";

export function createSessionContext(
  deps: Pick<SessionLifecycleDependencies, "projectionSnapshotQuery" | "workerRuntime" | "wired">,
) {
  const isOpenDelegation = (delegation: IsnadiDelegationRecord) =>
    !["Completed", "Failed", "Canceled"].includes(delegation.phase._tag);

  const isChildOf = (delegation: IsnadiDelegationRecord, threadId: ThreadId) =>
    "childThreadId" in delegation.phase && delegation.phase.childThreadId === threadId;

  // Resolves the thread's bot, group boss, and delegation links with by-id
  // reads. Falls back to the command read model for query doubles that do
  // not implement the narrow lookups.
  const readSessionStartContext = Effect.fn("AgentController.readSessionStartContext")(function* (
    threadId: ThreadId,
    fallbackBotId: BotId | null,
  ) {
    if (Option.isNone(deps.projectionSnapshotQuery)) {
      return {
        parentDelegation: undefined,
        bot: undefined,
        botId: fallbackBotId,
        activeChildDelegations: 0,
        threadTitle: undefined,
      };
    }

    const query = deps.projectionSnapshotQuery.value;
    const { getBotById, getGroupById, listThreadDelegations } = query;

    if (getBotById && getGroupById && listThreadDelegations) {
      const thread = Option.getOrUndefined(yield* query.getThreadRuntimeContext(threadId));
      const delegations = (yield* listThreadDelegations(threadId)).filter(isOpenDelegation);

      const group = thread?.groupId
        ? Option.getOrUndefined(yield* getGroupById(thread.groupId))
        : undefined;

      const botId =
        thread?.respondingBotId ?? thread?.botId ?? fallbackBotId ?? group?.bossBotId ?? null;

      const bot = botId ? Option.getOrUndefined(yield* getBotById(botId)) : undefined;
      const workerParentThreadId = isWorkerThreadId(threadId) ? thread?.parentThreadId : null;

      return {
        parentDelegation: delegations.find((candidate) => isChildOf(candidate, threadId)),
        workerParent: workerParentThreadId
          ? {
              delegatedAccess: (yield* listThreadDelegations(workerParentThreadId)).find(
                (candidate) => isChildOf(candidate, workerParentThreadId),
              )?.access,
            }
          : undefined,
        bot,
        botId,
        activeChildDelegations: delegations.filter(
          (candidate) => candidate.parentThreadId === threadId,
        ).length,
        threadTitle: thread?.title,
      };
    }

    const snapshot = yield* query.getCommandReadModel();
    const thread = snapshot.threads.find((candidate) => candidate.id === threadId);

    const group = thread?.groupId
      ? snapshot.groups.find((candidate) => candidate.id === thread.groupId)
      : undefined;

    const botId =
      thread?.respondingBotId ?? thread?.botId ?? fallbackBotId ?? group?.bossBotId ?? null;

    const workerParentThreadId = isWorkerThreadId(threadId) ? thread?.parentThreadId : null;

    return {
      parentDelegation: snapshot.delegations.find(
        (candidate) => isChildOf(candidate, threadId) && isOpenDelegation(candidate),
      ),
      workerParent: workerParentThreadId
        ? {
            delegatedAccess: snapshot.delegations.find((candidate) =>
              isChildOf(candidate, workerParentThreadId),
            )?.access,
          }
        : undefined,
      bot: snapshot.bots.find((candidate) => candidate.id === botId),
      botId,
      activeChildDelegations: snapshot.delegations.filter(
        (candidate) => candidate.parentThreadId === threadId && isOpenDelegation(candidate),
      ).length,
      threadTitle: thread?.title,
    };
  });

  const toGroupConversation = (
    group: OrchestrationGroup,
    bots: ReadonlyArray<OrchestrationBot | undefined>,
    respondingBotId: BotId,
  ): GroupConversationState => ({
    groupName: group.name,
    respondingBotId,
    members: group.members.flatMap((member) => {
      const bot = isGroupBotMember(member)
        ? bots.find((candidate) => candidate?.id === member.botId)
        : undefined;

      return isGroupBotMember(member) && bot && bot.archivedAt === null
        ? [{ botId: member.botId, name: bot.name, role: member.role, title: bot.title }]
        : [];
    }),
    people: group.members.flatMap((member) =>
      isGroupPersonMember(member) ? [member.displayName] : [],
    ),
  });

  // The group a thread belongs to, read fresh each turn so a member added or removed
  // between turns shows up without restarting the session. Direct chats return undefined.
  const readGroupConversation = Effect.fn("AgentController.readGroupConversation")(
    function* (threadId: ThreadId, fallbackBotId: BotId | null) {
      if (Option.isNone(deps.projectionSnapshotQuery)) return undefined;
      const query = deps.projectionSnapshotQuery.value;
      const { getBotById, getGroupById } = query;

      if (getBotById && getGroupById) {
        const thread = Option.getOrUndefined(yield* query.getThreadRuntimeContext(threadId));

        const group = thread?.groupId
          ? Option.getOrUndefined(yield* getGroupById(thread.groupId))
          : undefined;

        if (!group) return undefined;
        const respondingBotId = thread?.respondingBotId ?? fallbackBotId ?? group.bossBotId;

        if (!respondingBotId) return undefined;

        const bots = yield* Effect.forEach(
          group.members.filter(isGroupBotMember),
          (member) => getBotById(member.botId).pipe(Effect.map(Option.getOrUndefined)),
          { concurrency: 4 },
        );

        return toGroupConversation(group, bots, respondingBotId);
      }

      const snapshot = yield* query.getCommandReadModel();
      const thread = snapshot.threads.find((candidate) => candidate.id === threadId);

      const group = thread?.groupId
        ? snapshot.groups.find((candidate) => candidate.id === thread.groupId)
        : undefined;

      if (!group) return undefined;

      const respondingBotId = thread?.respondingBotId ?? fallbackBotId ?? group.bossBotId;

      return respondingBotId
        ? toGroupConversation(group, snapshot.bots, respondingBotId)
        : undefined;
    },
    Effect.orElseSucceed(() => undefined),
  );

  return { isOpenDelegation, isChildOf, readSessionStartContext, readGroupConversation };
}
