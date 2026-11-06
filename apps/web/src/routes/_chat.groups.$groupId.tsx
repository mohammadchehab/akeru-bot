import { createFileRoute } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { GroupDetailsPanel } from "../components/roster/GroupDetailsPanel";
import { GroupThreadLanding } from "../components/roster/GroupThreadLanding";
import { useRosterStore } from "../components/roster/rosterStore";
import { SPACE_TABS, SpaceView, type SpaceTab } from "../components/space/SpaceView";
import { usePrimaryEnvironmentId } from "../state/environments";

function GroupThreadRouteView() {
  const { groupId } = Route.useParams();
  const { tab = "chat" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const environmentId = usePrimaryEnvironmentId();

  const { group, bots } = useRosterStore(
    useShallow((state) => ({
      group: state.groups.find((candidate) => candidate.id === groupId) ?? null,
      bots: state.bots,
    })),
  );

  return (
    <>
      {group ? (
        <SpaceView
          group={group}
          tab={tab}
          // The chat tab is the default, so it leaves the URL bare and existing links stay as they were.
          onTabChange={(next) => void navigate({ search: next === "chat" ? {} : { tab: next } })}
          chat={<GroupThreadLanding groupId={groupId} />}
        />
      ) : (
        <GroupThreadLanding groupId={groupId} />
      )}
      {environmentId && group ? (
        <GroupDetailsPanel
          key={group.id}
          environmentId={environmentId}
          group={group}
          bots={bots}
          onDeleted={() => void navigate({ to: "/" })}
        />
      ) : null}
    </>
  );
}

export const Route = createFileRoute("/_chat/groups/$groupId")({
  validateSearch: (search: { tab?: unknown }): { tab?: SpaceTab } => {
    const tab = SPACE_TABS.find((candidate) => candidate === search.tab);

    return tab && tab !== "chat" ? { tab } : {};
  },
  component: GroupThreadRouteView,
});
