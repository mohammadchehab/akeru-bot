import type { ReactNode } from "react";

import { useI18n } from "../../i18n";
import { Empty, EmptyHeader } from "../ui/empty";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../ui/tabs";
import { SpaceOverview } from "./SpaceOverview";
import type { Group } from "../roster/types";

export const SPACE_TABS = ["overview", "chat", "skills", "files"] as const;

export type SpaceTab = (typeof SPACE_TABS)[number];

/** The space's four tabs. The chat tab keeps the existing group chat; the tab lives in the URL. */
export function SpaceView({
  group,
  tab,
  onTabChange,
  chat,
}: {
  group: Group;
  tab: SpaceTab;
  onTabChange: (tab: SpaceTab) => void;
  chat: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = SPACE_TABS.find((candidate) => candidate === value);

        if (next) onTabChange(next);
      }}
    >
      <TabsList aria-label={t("Space")}>
        <TabsTab value="overview">{t("Overview")}</TabsTab>
        <TabsTab value="chat">{t("Group chat")}</TabsTab>
        <TabsTab value="skills">{t("Skills")}</TabsTab>
        <TabsTab value="files">{t("Files")}</TabsTab>
      </TabsList>
      <TabsPanel value="overview">
        <SpaceOverview group={group} />
      </TabsPanel>
      <TabsPanel value="chat">{chat}</TabsPanel>
      <TabsPanel value="skills">
        <Empty>
          <EmptyHeader>{t("Skills for this space show here.")}</EmptyHeader>
        </Empty>
      </TabsPanel>
      <TabsPanel value="files">
        <Empty>
          <EmptyHeader>{t("Files you add to this space show here.")}</EmptyHeader>
        </Empty>
      </TabsPanel>
    </Tabs>
  );
}
