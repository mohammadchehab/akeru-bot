import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { readThreadShells } from "../../state/entities";
import { findLatestBotThreadTarget } from "../roster/botThreadRuntime.logic";
import { useRosterStore } from "../roster/rosterStore";

/**
 * Opens one specific chat: a bot chat in the bot's view (the newest chat opens as the bot's
 * current one), a group chat in the group's view. Reads the shells when called, so callers
 * do not re-render as shells stream.
 */
export function useOpenChat() {
  const navigate = useNavigate();

  return useCallback(
    async (chat: { readonly environmentId: string; readonly threadId: string }) => {
      const shells = readThreadShells();

      const shell = shells.find(
        (candidate) =>
          candidate.environmentId === chat.environmentId && candidate.id === chat.threadId,
      );

      if (shell?.botId) {
        const botId = shell.botId;
        const newest = findLatestBotThreadTarget(botId, chat.environmentId, shells);
        const roster = useRosterStore.getState();
        roster.selectBot(botId);
        roster.openBotChat(
          botId,
          newest?.threadId === chat.threadId ? null : chat.threadId,
          `/${chat.environmentId}/${chat.threadId}`,
        );
        await navigate({ to: "/bots/$botId", params: { botId } });
      } else if (shell?.groupId) {
        await navigate({ to: "/groups/$groupId", params: { groupId: shell.groupId } });
      }
    },
    [navigate],
  );
}
