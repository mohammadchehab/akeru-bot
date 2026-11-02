import { Predicate } from "effect";
import { useAtomValue } from "@effect/atom-react";
import { GroupId, type AuthSessionId, type EnvironmentId } from "@isnadi/contracts";
import { LogOutIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { botEnvironment, environmentPeopleAtom } from "../../state/bots";
import { useAtomCommand } from "../../state/use-atom-command";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { toastManager } from "../ui/toast";
import { groupPeopleRemovalCopy, groupPersonMembership } from "./groupPeople.logic";
import { groupPersonMembers } from "./roster.logic";
import type { Group } from "./types";
import { useAddableGroupPeople } from "./useAddableGroupPeople";

interface PendingRemoval {
  readonly personId: AuthSessionId;
  readonly displayName: string;
  readonly current: boolean;
}

/** The people in a group: remove or leave with a confirmation, and add paired people back. */
export function GroupPeopleSection({
  environmentId,
  group,
}: {
  readonly environmentId: EnvironmentId;
  readonly group: Group;
}) {
  const unassignPerson = useAtomCommand(botEnvironment.groups.unassignPerson, {
    reportFailure: false,
  });

  const assignPerson = useAtomCommand(botEnvironment.groups.assignPerson, {
    reportFailure: false,
  });

  const leaveGroup = useAtomCommand(botEnvironment.groups.leave, { reportFailure: false });
  const currentPersonId = useAtomValue(environmentPeopleAtom(environmentId)).current?.id;
  const { canAdd, people: addable, refresh } = useAddableGroupPeople(environmentId, group);
  const people = groupPersonMembers(group);
  const [newPersonId, setNewPersonId] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!addable.some((person) => person.personId === newPersonId)) setNewPersonId("");
  }, [addable, newPersonId]);

  if (people.length === 0 && !canAdd) return null;

  const run = async (action: () => Promise<{ readonly _tag: string }>, failure: string) => {
    setBusy(true);
    const result = await action();
    setBusy(false);

    if (Predicate.isTagged(result, "Failure")) {
      toastManager.add({ type: "error", title: failure });

      return false;
    }

    return true;
  };

  const confirmRemoval = (removal: PendingRemoval) => {
    const input = { groupId: GroupId.make(group.id), personId: removal.personId };

    void run(
      () =>
        removal.current
          ? leaveGroup({ environmentId, input })
          : unassignPerson({ environmentId, input }),
      removal.current ? "Could not leave group" : `Could not remove ${removal.displayName}`,
    );
  };

  const selected = addable.find((person) => person.personId === newPersonId);
  const copy = pendingRemoval ? groupPeopleRemovalCopy(pendingRemoval, group.name) : null;

  return (
    <section className="space-y-2" aria-labelledby="group-people-heading">
      <h3 id="group-people-heading" className="text-sm font-medium">
        People
      </h3>
      {people.length > 0 ? (
        <div className="space-y-1 rounded-lg border p-2">
          {people.map((person) => {
            const current = person.personId === currentPersonId;

            return (
              <div
                key={person.personId}
                className="flex min-h-9 items-center gap-2 rounded-md px-1"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {current ? "You" : person.displayName}
                </span>
                <Button
                  aria-label={
                    current
                      ? `Leave ${group.name}`
                      : `Remove ${person.displayName} from ${group.name}`
                  }
                  disabled={busy}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() =>
                    setPendingRemoval({
                      personId: person.personId,
                      displayName: person.displayName,
                      current,
                    })
                  }
                >
                  {current ? <LogOutIcon /> : <Trash2Icon />}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
      {canAdd ? (
        <div className="flex gap-2">
          <Select
            value={newPersonId}
            onOpenChange={(open) => open && refresh()}
            onValueChange={(value) => value && setNewPersonId(value)}
          >
            <SelectTrigger aria-label="Add person" className="min-w-0 flex-1">
              <SelectValue placeholder="Choose person">
                {selected ? (selected.current ? "You" : selected.displayName) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {addable.map((person) => (
                <SelectItem key={person.personId} value={person.personId}>
                  {person.current ? "You" : person.displayName}
                </SelectItem>
              ))}
              {addable.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Everyone who is paired is already in this group.
                </p>
              ) : null}
            </SelectPopup>
          </Select>
          <Button
            aria-label="Add person to group"
            disabled={busy || !selected}
            size="icon"
            variant="outline"
            onClick={() => {
              if (!selected) return;

              void run(
                () =>
                  assignPerson({
                    environmentId,
                    input: {
                      groupId: GroupId.make(group.id),
                      person: groupPersonMembership(selected),
                    },
                  }),
                `Could not add ${selected.displayName}`,
              ).then((success) => success && setNewPersonId(""));
            }}
          >
            <UserPlusIcon />
          </Button>
        </div>
      ) : null}
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                const removal = pendingRemoval;

                setPendingRemoval(null);

                if (removal) confirmRemoval(removal);
              }}
            >
              {copy?.confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </section>
  );
}
