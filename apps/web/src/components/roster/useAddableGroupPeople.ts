import { AuthAccessWriteScope, type EnvironmentId } from "@isnadi/contracts";
import { useEffect, useState } from "react";

import { listServerClientSessions } from "../../environments/primary/authAdministration";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { useEnvironmentSessionState } from "../../state/session";
import { addableGroupPeople, type AddableGroupPerson } from "./groupPeople.logic";
import type { Group } from "./types";

const NONE: ReadonlyArray<AddableGroupPerson> = [];

/**
 * People who can be added to the group. Adding a person needs the access scope and the
 * paired-client list, which only the primary environment serves; anywhere else this is empty.
 */
export function useAddableGroupPeople(
  environmentId: EnvironmentId,
  group: Group,
): ReadonlyArray<AddableGroupPerson> {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const session = useEnvironmentSessionState(environmentId);

  const canAdd =
    environmentId === primaryEnvironmentId &&
    session.data?.authenticated === true &&
    session.data.scopes?.includes(AuthAccessWriteScope) === true;

  const [people, setPeople] = useState(NONE);

  useEffect(() => {
    if (!canAdd) {
      setPeople(NONE);

      return;
    }

    let cancelled = false;

    // Reload when membership changes so a removed person shows up here and an added one leaves.
    void listServerClientSessions()
      .then((sessions) => {
        if (!cancelled) setPeople(addableGroupPeople(group, sessions));
      })
      .catch(() => {
        if (!cancelled) setPeople(NONE);
      });

    return () => {
      cancelled = true;
    };
  }, [canAdd, group]);

  return people;
}
