import { AuthSessionId } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { ServerClientSessionRecord } from "../../environments/primary/authAdministration";
import {
  addableGroupPeople,
  groupPeopleRemovalCopy,
  groupPersonMembership,
} from "./groupPeople.logic";
import type { Group } from "./types";

const session = (id: string, label: string | null, current = false): ServerClientSessionRecord => ({
  sessionId: AuthSessionId.make(id),
  subject: "pairing",
  scopes: [],
  method: "bearer-access-token",
  client: label === null ? { deviceType: "desktop" } : { deviceType: "desktop", label },
  issuedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-02-01T00:00:00.000Z",
  lastConnectedAt: null,
  connected: false,
  current,
});

const group = (personIds: ReadonlyArray<string>): Group => ({
  id: "group-1",
  name: "Ops",
  bossBotId: null,
  members: personIds.map((id) => ({
    kind: "person",
    personId: AuthSessionId.make(id),
    displayName: id,
  })),
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("addableGroupPeople", () => {
  it("lists paired people who are not in the group", () => {
    const people = addableGroupPeople(group(["a"]), [
      session("a", "Alice"),
      session("b", "Bea"),
      session("c", null, true),
    ]);

    expect(people).toEqual([
      { personId: "b", displayName: "Bea", current: false },
      { personId: "c", displayName: "Paired person", current: true },
    ]);
  });

  it("offers a removed person again", () => {
    const sessions = [session("a", "Alice"), session("b", "Bea")];

    expect(addableGroupPeople(group(["a", "b"]), sessions)).toEqual([]);
    expect(addableGroupPeople(group(["a"]), sessions).map((person) => person.personId)).toEqual([
      "b",
    ]);
  });
});

describe("groupPersonMembership", () => {
  it("builds the person payload of group.person.assign", () => {
    expect(
      groupPersonMembership({
        personId: AuthSessionId.make("b"),
        displayName: "Bea",
        current: false,
      }),
    ).toEqual({ kind: "person", personId: "b", displayName: "Bea" });
  });
});

describe("groupPeopleRemovalCopy", () => {
  it("names the person being removed and says they can be added back", () => {
    const copy = groupPeopleRemovalCopy({ displayName: "Bea", current: false }, "Ops");

    expect(copy.title).toBe('Remove Bea from "Ops"?');
    expect(copy.description).toContain("add them back");
    expect(copy.confirmLabel).toBe("Remove");
  });

  it("words leaving as the current person's own action", () => {
    expect(groupPeopleRemovalCopy({ displayName: "x", current: true }, "Ops").confirmLabel).toBe(
      "Leave group",
    );
  });
});
