import {
  isGroupBotMember,
  type BotId,
  type GroupAddressing,
  type GroupMembership,
  type MessageId,
} from "@isnadi/contracts";
import { collectComposerInlineTokens } from "@isnadi/shared/composerInlineTokens";
import * as Effect from "effect/Effect";

/**
 * Group members named by `@bot:<id>` tokens in a message, latest mention first. Clients may
 * send the token without resolving it to respondingBotId. Plain `@Name` stays client-resolved.
 */
export function groupMentionCandidates(
  members: ReadonlyArray<GroupMembership>,
  text: string,
): ReadonlyArray<BotId> {
  const memberBotIds = members.flatMap((member) =>
    isGroupBotMember(member) ? [member.botId] : [],
  );

  const candidates: BotId[] = [];

  for (const token of collectComposerInlineTokens(`${text}\n`).toReversed()) {
    if (token.type !== "bot-mention") continue;
    const botId = memberBotIds.find((id) => id === token.value);

    if (botId !== undefined && !candidates.includes(botId)) candidates.push(botId);
  }

  return candidates;
}

/**
 * The bot a group turn addresses: an explicit respondingBotId, else the latest active member
 * mentioned by token, else the boss. The decider and the pre-dispatch provider and cap gates
 * share this so they always check the bot that will actually run.
 */
export const resolveGroupResponderBotId = <E, R>(input: {
  readonly group: {
    readonly members: ReadonlyArray<GroupMembership>;
    readonly bossBotId: BotId | null;
  };
  readonly respondingBotId: BotId | undefined;
  readonly text: string;
  readonly isActive: (botId: BotId) => Effect.Effect<boolean, E, R>;
}): Effect.Effect<BotId | null, E, R> =>
  Effect.gen(function* () {
    if (input.respondingBotId !== undefined) return input.respondingBotId;

    for (const botId of groupMentionCandidates(input.group.members, input.text)) {
      if (yield* input.isActive(botId)) return botId;
    }

    return input.group.bossBotId;
  });

export type GroupAddressingResolution =
  | { readonly ok: true; readonly responders: ReadonlyArray<BotId> }
  | { readonly ok: false; readonly detail: string };

/**
 * Turns an addressing intent into the ordered bots that answer, first to last. Every bot must be
 * an active member: a mention of anyone else fails with a message that names it. `auto` is
 * answered by the boss until auto routing exists.
 */
export function resolveGroupAddressing(input: {
  readonly group: {
    readonly id: string;
    readonly members: ReadonlyArray<GroupMembership>;
    readonly bossBotId: BotId | null;
  };
  readonly messages: ReadonlyArray<{
    readonly id: MessageId;
    readonly role: string;
    readonly respondingBotId?: BotId | null | undefined;
  }>;
  readonly addressing: GroupAddressing;
  readonly isActive: (botId: BotId) => boolean;
}): GroupAddressingResolution {
  const memberBotIds = input.group.members.flatMap((member) =>
    isGroupBotMember(member) && input.isActive(member.botId) ? [member.botId] : [],
  );

  const boss = input.group.bossBotId;

  const bossFirst = (ids: ReadonlyArray<BotId>) =>
    boss === null || !ids.includes(boss) ? ids : [boss, ...ids.filter((id) => id !== boss)];

  const needBoss = (): GroupAddressingResolution =>
    boss !== null && memberBotIds.includes(boss)
      ? { ok: true, responders: [boss] }
      : { ok: false, detail: `Group '${input.group.id}' has no boss bot that can respond.` };

  switch (input.addressing.kind) {
    case "auto":
      return needBoss();
    case "everyone":
      return memberBotIds.length === 0
        ? needBoss()
        : { ok: true, responders: bossFirst(memberBotIds) };
    case "bots": {
      const named = [...new Set(input.addressing.botIds)];

      if (named.length === 0) return needBoss();

      const stranger = named.find((botId) => !memberBotIds.includes(botId));

      return stranger === undefined
        ? { ok: true, responders: named }
        : {
            ok: false,
            detail: `Bot '${stranger}' is not an active member of group '${input.group.id}'.`,
          };
    }
    case "reply": {
      const { messageId } = input.addressing;
      const target = input.messages.find((message) => message.id === messageId);

      if (target === undefined) {
        return { ok: false, detail: `Message '${messageId}' does not exist in this chat.` };
      }

      const author = target.respondingBotId ?? null;

      // Only a bot's own message can be replied to: a user message, or one saved without its
      // bot, has no one to answer.
      if (target.role !== "assistant" || author === null) {
        return { ok: false, detail: `Message '${messageId}' was not written by a bot.` };
      }

      return memberBotIds.includes(author)
        ? { ok: true, responders: [author] }
        : {
            ok: false,
            detail: `Bot '${author}' is not an active member of group '${input.group.id}'.`,
          };
    }
  }
}
