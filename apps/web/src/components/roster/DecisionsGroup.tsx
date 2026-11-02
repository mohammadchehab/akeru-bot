import type { Decision } from "@isnadi/client-runtime/decisions";
import { UsersIcon } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../i18n";
import { useDecisions } from "../../state/entities";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { useOpenChat } from "../chat/useOpenChat";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { BotAvatarView } from "./BotAvatarView";
import type { Bot } from "./types";
import { useRosterStore } from "./rosterStore";

const VISIBLE_ROWS = 5;

interface DecisionOwner {
  readonly name: string;
  readonly avatar: Bot["avatar"] | null;
}

/** The group's rows, with no state of its own so a test can render it directly. */
export function DecisionsList({
  decisions,
  expanded,
  ownerOf,
  onOpen,
  onExpand,
}: {
  decisions: ReadonlyArray<Decision>;
  expanded: boolean;
  ownerOf: (decision: Decision) => DecisionOwner;
  onOpen: (decision: Decision) => void;
  onExpand: () => void;
}) {
  const { t } = useI18n();
  const rows = expanded ? decisions : decisions.slice(0, VISIBLE_ROWS);

  return (
    <SidebarGroup
      data-testid="decisions-group"
      className="px-(--sidebar-content-inset) pb-1 pt-1 group-data-[collapsible=icon]:hidden"
    >
      <SidebarGroupLabel>{t("Decisions")}</SidebarGroupLabel>
      <SidebarGroupContent>
        {decisions.length === 0 ? (
          <p className="px-2 py-1 text-xs text-sidebar-muted-foreground">
            {t("Nothing waiting on you")}
          </p>
        ) : (
          <SidebarMenu>
            {rows.map((decision) => {
              const owner = ownerOf(decision);
              const kind = decision.kind === "approval" ? t("Approval needed") : t("Question");

              return (
                <SidebarMenuItem key={decision.threadId}>
                  <SidebarMenuButton
                    size="lg"
                    aria-label={`${kind}: ${owner.name} · ${decision.title}`}
                    onClick={() => onOpen(decision)}
                  >
                    {owner.avatar !== null ? (
                      <BotAvatarView avatar={owner.avatar} name={owner.name} className="size-8" />
                    ) : (
                      <UsersIcon className="size-8 rounded-full bg-sidebar-row-hover p-2" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <bdi className="truncate text-sm">{owner.name}</bdi>
                      <span className="flex min-w-0 gap-1 text-xs text-sidebar-muted-foreground">
                        <bdi className="truncate">{decision.title}</bdi>
                        <span className="shrink-0">· {kind}</span>
                      </span>
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            {decisions.length > VISIBLE_ROWS && !expanded ? (
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" onClick={onExpand}>
                  {t("Show all ({count})", { count: decisions.length })}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Chats where a bot waits on the user for an approval or a question, across every project.
 * A row opens that exact chat and disappears when the prompt is answered.
 */
export function DecisionsGroup() {
  const decisions = useDecisions(usePrimaryEnvironmentId());
  const openChat = useOpenChat();
  const bots = useRosterStore((state) => state.bots);
  const groups = useRosterStore((state) => state.groups);
  const [expanded, setExpanded] = useState(false);

  const ownerOf = (decision: Decision): DecisionOwner => {
    if (decision.botId !== null) {
      const bot = bots.find((candidate) => candidate.id === decision.botId);

      return { name: bot?.name ?? "", avatar: bot?.avatar ?? null };
    }

    return {
      name: groups.find((group) => group.id === decision.groupId)?.name ?? "",
      avatar: null,
    };
  };

  return (
    <DecisionsList
      decisions={decisions}
      expanded={expanded}
      ownerOf={ownerOf}
      onOpen={(decision) => void openChat(decision)}
      onExpand={() => setExpanded(true)}
    />
  );
}
