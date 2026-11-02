import { BotId, EnvironmentId, GroupId, ProjectId, ThreadId } from "@isnadi/contracts";
import { describe, expect, it } from "@effect/vitest";

import { selectDecisions } from "./decisions.ts";
import type { EnvironmentThreadShell } from "./state/models.ts";

const PRIMARY = EnvironmentId.make("primary");

function shell(
  id: string,
  updatedAt: string,
  extra: Partial<EnvironmentThreadShell> = {},
): EnvironmentThreadShell {
  return {
    id: ThreadId.make(id),
    environmentId: PRIMARY,
    projectId: ProjectId.make("project-1"),
    botId: BotId.make("a"),
    title: id,
    updatedAt,
    archivedAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    ...extra,
  } as EnvironmentThreadShell;
}

describe("selectDecisions", () => {
  it("lists approvals and questions across projects, newest first", () => {
    const rows = selectDecisions(
      [
        shell("approval", "2026-06-01T00:00:00.000Z", {
          hasPendingApprovals: true,
          projectId: ProjectId.make("project-1"),
        }),
        shell("question", "2026-06-02T00:00:00.000Z", {
          hasPendingUserInput: true,
          botId: undefined,
          groupId: GroupId.make("g"),
          projectId: ProjectId.make("project-2"),
        }),
        shell("idle", "2026-06-03T00:00:00.000Z"),
      ],
      PRIMARY,
    );

    expect(rows.map((row) => [row.threadId, row.kind, row.botId, row.groupId])).toEqual([
      ["question", "question", null, "g"],
      ["approval", "approval", "a", null],
    ]);
  });

  it("lets an approval win when both flags are set", () => {
    const [row] = selectDecisions(
      [
        shell("both", "2026-06-01T00:00:00.000Z", {
          hasPendingApprovals: true,
          hasPendingUserInput: true,
        }),
      ],
      PRIMARY,
    );

    expect(row?.kind).toBe("approval");
  });

  it("leaves out archived, ownerless and other-environment chats", () => {
    const pending = { hasPendingApprovals: true };

    expect(
      selectDecisions(
        [
          shell("archived", "2026-06-01T00:00:00.000Z", {
            ...pending,
            archivedAt: "2026-06-02T00:00:00.000Z",
          }),
          shell("ownerless", "2026-06-01T00:00:00.000Z", { ...pending, botId: undefined }),
          shell("elsewhere", "2026-06-01T00:00:00.000Z", {
            ...pending,
            environmentId: EnvironmentId.make("remote"),
          }),
        ],
        PRIMARY,
      ),
    ).toEqual([]);
    expect(selectDecisions([shell("x", "2026-06-01T00:00:00.000Z", pending)], null)).toEqual([]);
  });

  it("stands a delegated sub-chat in for its root chat, once", () => {
    const rows = selectDecisions(
      [
        shell("root", "2026-06-01T00:00:00.000Z", {
          title: "Root chat",
          hasPendingUserInput: true,
        }),
        shell("child", "2026-06-03T00:00:00.000Z", {
          parentThreadId: ThreadId.make("root"),
          hasPendingApprovals: true,
        }),
        shell("grandchild", "2026-06-02T00:00:00.000Z", {
          parentThreadId: ThreadId.make("child"),
          hasPendingApprovals: true,
        }),
      ],
      PRIMARY,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      threadId: "root",
      title: "Root chat",
      kind: "approval",
      updatedAt: "2026-06-03T00:00:00.000Z",
    });
  });

  it("drops a sub-chat whose root is archived or missing", () => {
    expect(
      selectDecisions(
        [
          shell("root", "2026-06-01T00:00:00.000Z", { archivedAt: "2026-06-02T00:00:00.000Z" }),
          shell("child", "2026-06-01T00:00:00.000Z", {
            parentThreadId: ThreadId.make("root"),
            hasPendingApprovals: true,
          }),
          shell("orphan", "2026-06-01T00:00:00.000Z", {
            parentThreadId: ThreadId.make("gone"),
            hasPendingApprovals: true,
          }),
        ],
        PRIMARY,
      ),
    ).toEqual([]);
  });
});
