import { AuthSessionId, EnvironmentId } from "@isnadi/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const fixtures = vi.hoisted(() => ({ canAdd: false }));

vi.mock("@effect/atom-react", () => ({ useAtomValue: () => ({ current: { id: "me" } }) }));

vi.mock("../../state/bots", () => ({
  botEnvironment: { groups: { unassignPerson: {}, assignPerson: {}, leave: {} } },
  environmentPeopleAtom: () => "people",
}));

vi.mock("../../state/use-atom-command", () => ({ useAtomCommand: () => vi.fn() }));

vi.mock("./useAddableGroupPeople", () => ({
  useAddableGroupPeople: () => ({ canAdd: fixtures.canAdd, people: [], refresh: vi.fn() }),
}));

import { GroupPeopleSection } from "./GroupPeopleSection";
import type { Group } from "./types";

const environmentId = EnvironmentId.make("environment-1");

const group = (people: ReadonlyArray<{ id: string; name: string }>): Group => ({
  id: "group-1",
  name: "Ops",
  bossBotId: null,
  members: people.map((person) => ({
    kind: "person",
    personId: AuthSessionId.make(person.id),
    displayName: person.name,
  })),
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const render = (target: Group) =>
  renderToStaticMarkup(<GroupPeopleSection environmentId={environmentId} group={target} />);

describe("GroupPeopleSection", () => {
  beforeEach(() => {
    fixtures.canAdd = false;
  });

  it("renders nothing when the group has no people and this client cannot add any", () => {
    expect(render(group([]))).toBe("");
  });

  it("lists members with a remove action and no add control without the access scope", () => {
    const html = render(group([{ id: "b", name: "Bea" }]));

    expect(html).toContain('aria-label="Remove Bea from Ops"');
    expect(html).not.toContain('aria-label="Add person"');
  });

  it("offers an add control to a client that may add people", () => {
    fixtures.canAdd = true;

    const html = render(group([{ id: "me", name: "Me" }]));

    expect(html).toContain('aria-label="Leave Ops"');
    expect(html).toContain('aria-label="Add person"');
    expect(html).toContain('aria-label="Add person to group"');
  });

  it("shows the add control even when the group has no people left", () => {
    fixtures.canAdd = true;

    expect(render(group([]))).toContain('aria-label="Add person"');
  });
});
