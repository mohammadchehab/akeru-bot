import { EnvironmentId, ThreadId } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { Decision } from "../decisions.ts";
import {
  spaceActivity,
  spaceDecisions,
  spaceMembers,
  spaceRoutines,
  weekStart,
  type SpaceGroup,
  type SpaceRoutine,
} from "./overview.ts";

const group: SpaceGroup = {
  id: "g1",
  bossBotId: "boss",
  members: [{ kind: "bot", botId: "boss" }, { kind: "bot", botId: "a" }, { kind: "person" }],
};

const decision = (botId: string | null, groupId: string | null): Decision => {
  const threadId = ThreadId.make(`${botId}-${groupId}`);

  return {
    environmentId: EnvironmentId.make("primary"),
    threadId,
    targetThreadId: threadId,
    botId,
    groupId,
    title: "Decision",
    kind: "approval",
    updatedAt: "2026-11-06T10:00:00.000Z",
  };
};

const shell = (id: string, updatedAt: string, owner: { botId?: string; groupId?: string }) => ({
  id,
  updatedAt,
  archivedAt: null,
  ...owner,
});

describe("space overview", () => {
  it("lists member bots once and skips people", () => {
    expect([...spaceMembers(group)].toSorted()).toEqual(["a", "boss"]);
  });

  it("counts a decision in a member's solo chat, not another space's", () => {
    const result = spaceDecisions(
      [decision("a", null), decision(null, "g1"), decision("x", null), decision("a", "g2")],
      group,
    );

    expect(result).toHaveLength(2);
  });

  it("ignores disabled and deleted routines", () => {
    const routine = (over: Partial<SpaceRoutine>): SpaceRoutine => ({
      botId: "a",
      enabled: true,
      lifecycle: "active",
      nextRunAt: "2026-11-07T09:00:00.000Z",
      ...over,
    });

    expect(
      spaceRoutines(
        [
          routine({}),
          routine({ nextRunAt: "2026-11-06T09:00:00.000Z" }),
          routine({ enabled: false }),
          routine({ lifecycle: "deleted" }),
          routine({ botId: "x" }),
        ],
        group,
      ),
    ).toEqual({ active: 2, nextRunAt: "2026-11-06T09:00:00.000Z" });
  });

  it("caps activity at 20 with waiting chats first", () => {
    const stamp = (i: number) => `2026-11-06T10:${String(i).padStart(2, "0")}:00.000Z`;

    const shells = Array.from({ length: 30 }, (_, i) =>
      shell(`t${i}`, stamp(i), { groupId: "g1" }),
    );

    const result = spaceActivity(shells, group, new Set(["t0"]));

    expect(result).toHaveLength(20);
    expect(result[0]?.id).toBe("t0");
    expect(result[1]?.id).toBe("t29");
  });

  it("starts the week at Monday 00:00 local across a DST change", () => {
    // Europe/Amsterdam leaves summer time on 2026-10-25 (Sunday), so Monday 10-26 is UTC+1.
    expect(weekStart(new Date("2026-10-28T12:00:00Z"), "Europe/Amsterdam")).toBe(
      "2026-10-25T23:00:00.000Z",
    );
    // The Monday before the change is still UTC+2.
    expect(weekStart(new Date("2026-10-22T12:00:00Z"), "Europe/Amsterdam")).toBe(
      "2026-10-18T22:00:00.000Z",
    );
    // A week that contains the change keeps the Monday's own offset.
    expect(weekStart(new Date("2026-10-25T12:00:00Z"), "Europe/Amsterdam")).toBe(
      "2026-10-18T22:00:00.000Z",
    );
  });
});
