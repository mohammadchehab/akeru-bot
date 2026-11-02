import {
  GROUP_HOP_BUDGET_DEFAULT,
  MessageId,
  ProviderInstanceId,
  type CommandId,
  type OrchestrationCommand,
  type OrchestrationEvent,
  type OrchestrationReadModel,
  type OrchestrationThread,
  type ResponderQueue,
  type ResponderQueueEntry,
  type ResponderQueueReason,
  type ThreadId,
} from "@isnadi/contracts";
import type * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import type * as PlatformError from "effect/PlatformError";

import { requireThread } from "../commandInvariants.ts";
import type { OrchestrationCommandInvariantError } from "../Errors.ts";
import { resolveComposerAddressing } from "@isnadi/shared/composerBotMentions";
import { activeGroupBotIds, withEventBase } from "./eventBase.ts";

/** What a queue event says about the budget; the decider keeps both numbers true at each turn start. */
export interface ResponderBudget {
  readonly hopsLeft: number;
  readonly hopsUsed: number;
}

/**
 * The budget after a user message has started its first bot turn. The chat's setting is read when
 * the message is decided, so changing it mid-chain applies from the next user message.
 */
export const budgetAfterFirstTurn = (thread: OrchestrationThread): ResponderBudget => ({
  hopsLeft: (thread.hopBudget ?? GROUP_HOP_BUDGET_DEFAULT) - 1,
  hopsUsed: 1,
});

/** The budget a queue carries; a queue written before hopsUsed existed counts as none used. */
export const budgetOf = (queue: ResponderQueue): ResponderBudget => ({
  hopsLeft: queue.hopsLeft,
  hopsUsed: queue.hopsUsed ?? 0,
});

/** The budget after the queue starts one more turn. Addressed bots always run, so it floors at 0. */
export const budgetAfterTurnStarted = (queue: ResponderBudget): ResponderBudget => ({
  hopsLeft: Math.max(0, queue.hopsLeft - 1),
  hopsUsed: queue.hopsUsed + 1,
});

/** Builds one `thread.responder-queue.set` event; a queue event always replaces the last whole. */
export const responderQueueSetEvent = Effect.fn("responderQueueSetEvent")(function* (input: {
  readonly threadId: ThreadId;
  readonly commandId: CommandId;
  readonly createdAt: string;
  readonly causationEventId?: OrchestrationEvent["eventId"];
  readonly entries: ReadonlyArray<ResponderQueueEntry>;
  readonly budget: ResponderBudget;
  /** Copied from the queue being replaced; a user message starts without it. */
  readonly budgetExhausted?: boolean | undefined;
  readonly reason: ResponderQueueReason;
}) {
  return {
    ...(yield* withEventBase({
      aggregateKind: "thread",
      aggregateId: input.threadId,
      occurredAt: input.createdAt,
      commandId: input.commandId,
    })),
    ...(input.causationEventId === undefined ? {} : { causationEventId: input.causationEventId }),
    type: "thread.responder-queue.set",
    payload: {
      threadId: input.threadId,
      entries: input.entries,
      hopsLeft: input.budget.hopsLeft,
      hopsUsed: input.budget.hopsUsed,
      ...(input.budgetExhausted ? { budgetExhausted: true } : {}),
      reason: input.reason,
      updatedAt: input.createdAt,
    },
  } satisfies Omit<OrchestrationEvent, "sequence">;
});

/**
 * Whether the turn the queue last started is still in flight. A queue written for a turn start
 * ("addressed", "turn-started") carries that turn's request time, so a turn is answering until it
 * has appeared in the read model and stopped running. A session that failed or stopped after the
 * request, with no newer turn, means the started turn ended without ever appearing.
 */
const startedTurnInFlight = (thread: OrchestrationThread, queue: ResponderQueue): boolean => {
  if (thread.latestTurn?.state === "running" || thread.session?.status === "running") return true;

  if (queue.reason !== "addressed" && queue.reason !== "turn-started") return false;

  if (thread.latestTurn !== null && thread.latestTurn.requestedAt >= queue.updatedAt) return false;

  const session = thread.session;

  const sessionEndedAfterRequest =
    session !== null &&
    session.updatedAt > queue.updatedAt &&
    (session.status === "error" ||
      session.status === "stopped" ||
      session.status === "interrupted");

  return !sessionEndedAfterRequest;
};

/**
 * Starts the next waiting bot. Safe to ask twice: it does nothing while the last started turn is
 * in flight. Leading bots that left the group are dropped in the same pass, so the ones behind
 * them are never stranded.
 */
export const decideResponderAdvance = Effect.fn("decideResponderAdvance")(function* ({
  command,
  readModel,
}: {
  readonly command: Extract<OrchestrationCommand, { type: "thread.responder.advance" }>;
  readonly readModel: OrchestrationReadModel;
}): Effect.fn.Return<
  ReadonlyArray<Omit<OrchestrationEvent, "sequence">>,
  OrchestrationCommandInvariantError | PlatformError.PlatformError,
  Crypto.Crypto
> {
  const thread = yield* requireThread({ readModel, command, threadId: command.threadId });
  const queue = thread.responderQueue;

  if (queue === undefined || queue.entries.length === 0 || startedTurnInFlight(thread, queue)) {
    return [];
  }

  const group = thread.groupId
    ? readModel.groups.find((entry) => entry.id === thread.groupId)
    : undefined;

  const activeIds = group === undefined ? new Set<string>() : activeGroupBotIds(readModel, group);

  const activeBot = (entry: ResponderQueueEntry) =>
    readModel.bots.find(
      (bot) => bot.id === entry.botId && bot.archivedAt === null && activeIds.has(bot.id),
    );

  const nextIndex = queue.entries.findIndex((entry) => activeBot(entry) !== undefined);
  const next = queue.entries[nextIndex];
  const nextBot = next === undefined ? undefined : activeBot(next);

  const setQueue = (
    entries: ReadonlyArray<ResponderQueueEntry>,
    budget: ResponderBudget,
    reason: ResponderQueueReason,
  ) =>
    responderQueueSetEvent({
      threadId: command.threadId,
      commandId: command.commandId,
      createdAt: command.createdAt,
      entries,
      budget,
      budgetExhausted: queue.budgetExhausted,
      reason,
    });

  // Everyone waiting has left the group or been archived: nobody is woken, the queue just ends.
  if (next === undefined || nextBot === undefined) {
    return [yield* setQueue([], budgetOf(queue), "superseded")];
  }

  const poppedEvent = yield* setQueue(
    queue.entries.slice(nextIndex + 1),
    budgetAfterTurnStarted(budgetOf(queue)),
    "turn-started",
  );

  const turnStartEvent: Omit<OrchestrationEvent, "sequence"> = {
    ...(yield* withEventBase({
      aggregateKind: "thread",
      aggregateId: command.threadId,
      occurredAt: command.createdAt,
      commandId: command.commandId,
    })),
    causationEventId: poppedEvent.eventId,
    type: "thread.turn-start-requested",
    payload: {
      threadId: command.threadId,
      // The turn answers the message that addressed it; it reads the rest through shared history.
      messageId:
        next.trigger.kind === "user"
          ? next.trigger.messageId
          : MessageId.make(`${command.commandId}:responder`),
      ...(nextBot.engine !== null
        ? {
            modelSelection: {
              instanceId: ProviderInstanceId.make(nextBot.engine.provider),
              model: nextBot.engine.model,
              ...(nextBot.engine.options ? { options: nextBot.engine.options } : {}),
            },
          }
        : {}),
      runtimeMode: thread.runtimeMode,
      interactionMode: thread.interactionMode,
      respondingBotId: nextBot.id,
      trigger: next.trigger,
      createdAt: command.createdAt,
    },
  };

  return [poppedEvent, turnStartEvent];
});

// A queue rewritten by one of these after the reply's turn began belongs to a newer message or a
// Stop, so that reply no longer chains.
const REWRITES_THE_CHAIN: ReadonlySet<ResponderQueueReason> = new Set([
  "addressed",
  "superseded",
  "stopped",
]);

/**
 * Queues the bots a finished reply mentions. The hop budget gates only these mention-triggered
 * entries: bots the user addressed always run, so a mention dropped for budget never removes
 * them. Dropping one sets the sticky `budgetExhausted` flag so clients can say the chain was cut.
 */
export const decideResponderMention = Effect.fn("decideResponderMention")(function* ({
  command,
  readModel,
}: {
  readonly command: Extract<OrchestrationCommand, { type: "thread.responder.mention" }>;
  readonly readModel: OrchestrationReadModel;
}): Effect.fn.Return<
  ReadonlyArray<Omit<OrchestrationEvent, "sequence">>,
  OrchestrationCommandInvariantError | PlatformError.PlatformError,
  Crypto.Crypto
> {
  const thread = yield* requireThread({ readModel, command, threadId: command.threadId });
  const queue = thread.responderQueue;
  const latestTurn = thread.latestTurn;

  const group = thread.groupId
    ? readModel.groups.find((entry) => entry.id === thread.groupId)
    : undefined;

  // Only the chat's latest turn chains, and not after a Stop or a newer message rewrote the queue.
  if (group === undefined || latestTurn === null || latestTurn.turnId !== command.turnId) return [];

  if (
    queue !== undefined &&
    queue.updatedAt > latestTurn.requestedAt &&
    REWRITES_THE_CHAIN.has(queue.reason)
  ) {
    return [];
  }

  const activeIds = activeGroupBotIds(readModel, group);

  const members = readModel.bots.flatMap((bot) =>
    bot.archivedAt === null && activeIds.has(bot.id) ? [{ id: bot.id, name: bot.name }] : [],
  );

  const addressing = resolveComposerAddressing(command.text, members);

  if (addressing.kind !== "bots") return [];

  const entries = queue?.entries ?? [];
  const waiting = new Set(entries.map((entry) => entry.botId));

  // In the order the reply wrote them, so a spent budget keeps the first mention.
  const fresh = addressing.botIds.flatMap((id) => {
    const member = members.find((candidate) => candidate.id === id);

    return member !== undefined && member.id !== command.botId && !waiting.has(member.id)
      ? [member.id]
      : [];
  });

  if (fresh.length === 0) return [];

  // Pending entries will spend the budget when they start, so only what is left beyond them can
  // be added by a mention.
  const budget = queue === undefined ? budgetAfterFirstTurn(thread) : budgetOf(queue);
  const added = fresh.slice(0, Math.max(0, budget.hopsLeft - entries.length));
  const dropped = added.length < fresh.length;

  return [
    yield* responderQueueSetEvent({
      threadId: command.threadId,
      commandId: command.commandId,
      createdAt: command.createdAt,
      entries: [
        ...entries,
        ...added.map((botId) => ({
          botId,
          trigger: {
            kind: "bot-mention" as const,
            sourceTurnId: command.turnId,
            sourceBotId: command.botId,
          },
        })),
      ],
      budget,
      budgetExhausted: queue?.budgetExhausted === true || dropped,
      // The reason names why the queue last changed; "budget-exhausted" only when the budget
      // is what left it empty.
      reason: entries.length === 0 && added.length === 0 ? "budget-exhausted" : "mention",
    }),
  ];
});
