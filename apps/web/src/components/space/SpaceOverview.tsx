import type { Decision } from "@isnadi/client-runtime/decisions";
import { relativeRunTime, routineDateLabel } from "@isnadi/client-runtime/routines";
import {
  spaceActivity,
  spaceDecisions,
  spaceRoutines,
  type SpaceRoutine,
} from "@isnadi/client-runtime/space";

import { useI18n } from "../../i18n";
import { useDecisions, useThreadShells } from "../../state/entities";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { useEnvironmentSnapshot } from "../../state/environmentSnapshot";
import { useOpenChat } from "../chat/useOpenChat";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import type { Group } from "../roster/types";
import { useRosterStore } from "../roster/rosterStore";

const NO_ROUTINES: ReadonlyArray<SpaceRoutine> = [];

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0 gap-2 p-4">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </Card>
  );
}

/**
 * The space's dashboard. Everything is derived from data the client already holds (chat
 * shells, decisions, the routine snapshot), so it adds no server read model.
 */
export function SpaceOverview({ group }: { group: Group }) {
  const i18n = useI18n();
  const { t } = i18n;
  const environmentId = usePrimaryEnvironmentId();
  const openChat = useOpenChat();
  const bots = useRosterStore((state) => state.bots);
  const shells = useThreadShells();
  const allDecisions = useDecisions(environmentId);
  const snapshot = useEnvironmentSnapshot();

  const decisions = spaceDecisions(allDecisions, group);
  const routines = spaceRoutines(snapshot?.routines ?? NO_ROUTINES, group);

  const waiting = new Set(decisions.map((decision) => decision.threadId));

  const activity = spaceActivity(
    shells.filter((shell) => shell.environmentId === environmentId),
    group,
    waiting,
  );

  const updated = relativeRunTime(group.updatedAt, Date.now(), i18n);
  const boss = bots.find((bot) => bot.id === group.bossBotId);

  const open = (chat: { environmentId: string; threadId: string }) => void openChat(chat);

  const openDecision = (decision: Decision) =>
    open({ environmentId: decision.environmentId, threadId: decision.targetThreadId });

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
      data-testid="space-overview"
    >
      <p className="text-sm text-muted-foreground">
        {t("Dashboard")}
        {boss ? <bdi> · {t("Published by {name}", { name: boss.name })}</bdi> : null}
        {" · "}
        {t("updated {time}", { time: updated })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Tile title={t("Decisions")}>
          {decisions.length === 0 ? (
            <p className="text-sm">{t("Nothing waiting on you")}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold">{decisions.length}</p>
              <Button size="sm" variant="outline" onClick={() => openDecision(decisions[0]!)}>
                {t("Review")}
              </Button>
            </>
          )}
        </Tile>
        <Tile title={t("Routines")}>
          <p className="text-2xl font-semibold">{routines.active}</p>
          <p className="text-xs text-muted-foreground">
            {t("Next run")}: {routineDateLabel(routines.nextRunAt, i18n)}
          </p>
        </Tile>
      </div>
      <Tile title={t("Activity")}>
        {activity.length === 0 ? (
          <p className="text-sm">{t("Nothing here yet")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {activity.map((shell) => (
              <li key={shell.id} className="flex items-center gap-2 py-2">
                <bdi className="min-w-0 flex-1 truncate text-sm">{shell.title}</bdi>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeRunTime(shell.updatedAt, Date.now(), i18n)}
                </span>
                {waiting.has(shell.id) ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => open({ environmentId: shell.environmentId, threadId: shell.id })}
                  >
                    {t("Review")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </div>
  );
}
