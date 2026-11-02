import type { GroupPersonMembership } from "@isnadi/contracts";

import type { ServerClientSessionRecord } from "../../environments/primary/authAdministration";
import type { Group } from "./types";
import { groupPersonMembers } from "./roster.logic";

export interface AddableGroupPerson {
  readonly personId: GroupPersonMembership["personId"];
  readonly displayName: string;
  readonly current: boolean;
}

/**
 * Paired people who are not in the group yet. The server resolves the display name again
 * from the session when it handles the command, so the label here is only for the picker.
 */
export function addableGroupPeople(
  group: Group,
  clientSessions: ReadonlyArray<ServerClientSessionRecord>,
): ReadonlyArray<AddableGroupPerson> {
  const memberIds = new Set(groupPersonMembers(group).map((person) => person.personId));

  return clientSessions.flatMap((session) =>
    memberIds.has(session.sessionId)
      ? []
      : [
          {
            personId: session.sessionId,
            displayName: session.client.label ?? "Paired person",
            current: session.current,
          },
        ],
  );
}

export function groupPersonMembership(person: AddableGroupPerson): GroupPersonMembership {
  return { kind: "person", personId: person.personId, displayName: person.displayName };
}

export interface GroupPeopleRemovalCopy {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
}

/** What the removal confirmation says; leaving is the current person removing themselves. */
export function groupPeopleRemovalCopy(
  removal: { readonly displayName: string; readonly current: boolean },
  groupName: string,
): GroupPeopleRemovalCopy {
  if (removal.current) {
    return {
      title: `Leave "${groupName}"?`,
      description: "You stop seeing this group until someone adds you back.",
      confirmLabel: "Leave group",
    };
  }

  return {
    title: `Remove ${removal.displayName} from "${groupName}"?`,
    description: "They stop seeing this group. You can add them back from this panel.",
    confirmLabel: "Remove",
  };
}
