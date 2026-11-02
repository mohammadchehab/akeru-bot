import { AuthAccessWriteScope, type EnvironmentId } from "@isnadi/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listServerClientSessions,
  type ServerClientSessionRecord,
} from "../../environments/primary/authAdministration";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { useEnvironmentSessionState } from "../../state/session";
import { addableGroupPeople, type AddableGroupPerson } from "./groupPeople.logic";
import { groupPersonMembers } from "./roster.logic";
import type { Group } from "./types";

const NONE: ReadonlyArray<AddableGroupPerson> = [];

export interface AddableGroupPeople {
  /** Whether this client may add people at all: primary environment and the access scope. */
  readonly canAdd: boolean;
  readonly people: ReadonlyArray<AddableGroupPerson>;
  /** Reloads the paired-client list; devices can pair while the editor stays mounted. */
  readonly refresh: () => void;
}

/**
 * People who can be added to the group. Adding a person needs the access scope and the
 * paired-client list, which only the primary environment serves; anywhere else `canAdd` is false.
 */
export function useAddableGroupPeople(
  environmentId: EnvironmentId,
  group: Group,
): AddableGroupPeople {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const session = useEnvironmentSessionState(environmentId);

  const canAdd =
    environmentId === primaryEnvironmentId &&
    session.data?.authenticated === true &&
    session.data.scopes?.includes(AuthAccessWriteScope) === true;

  const [sessions, setSessions] = useState<ReadonlyArray<ServerClientSessionRecord>>([]);
  const [reloads, setReloads] = useState(0);
  const refresh = useCallback(() => setReloads((count) => count + 1), []);

  // Membership is the only part of the group that changes who can be added, so key on it
  // rather than on the group object, which is new on every snapshot update.
  const memberKey = groupPersonMembers(group)
    .map((person) => person.personId)
    .join(",");

  // The editor stays mounted while its panel is collapsed, so reload when the window returns.
  useEffect(() => {
    if (!canAdd) return;

    window.addEventListener("focus", refresh);

    return () => window.removeEventListener("focus", refresh);
  }, [canAdd, refresh]);

  useEffect(() => {
    if (!canAdd) {
      setSessions([]);

      return;
    }

    let cancelled = false;

    // Reload when membership changes too, so a removed person shows up here and an added one leaves.
    void listServerClientSessions()
      .then((next) => {
        if (!cancelled) setSessions(next);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [canAdd, memberKey, reloads]);

  const people = useMemo(
    () => (canAdd ? addableGroupPeople(group, sessions) : NONE),
    [canAdd, group, sessions],
  );

  return { canAdd, people, refresh };
}
