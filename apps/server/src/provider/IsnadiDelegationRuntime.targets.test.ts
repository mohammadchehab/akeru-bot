import { BotId, GroupId } from "@isnadi/contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { IsnadiDelegationUnknownBotError } from "./delegation/IsnadiDelegationPolicy.ts";
import { createIsnadiToolRuntime } from "./IsnadiToolRuntime.ts";
import {
  CHILD_BOT_ID,
  NOW,
  PARENT_BOT_ID,
  PARENT_THREAD_ID,
  bot,
  harness,
  parent,
  snapshot,
  thread,
} from "./testUtils/delegationHarness.ts";

const groupSnapshot = () => {
  const groupId = GroupId.make("group-1");

  return snapshot({
    bots: [
      bot(PARENT_BOT_ID, { groupId, name: "Boss" }),
      bot(CHILD_BOT_ID, { groupId, name: "Scout" }),
    ],
    groups: [
      {
        id: groupId,
        name: "Research",
        bossBotId: PARENT_BOT_ID,
        members: [
          { kind: "bot" as const, botId: PARENT_BOT_ID, role: "boss" as const },
          { kind: "bot" as const, botId: CHILD_BOT_ID, role: "specialist" as const },
        ],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    threads: [thread(PARENT_THREAD_ID, null, { groupId, respondingBotId: PARENT_BOT_ID })],
  });
};

describe("bot tools that name a target bot", () => {
  it("resolves a group member name to its bot ID for CheckAgent and StopAgent", async () => {
    const test = harness(groupSnapshot());

    await expect(
      test.runtime.check(parent(), { botId: BotId.make("scout") }),
    ).resolves.toMatchObject({ botId: CHILD_BOT_ID, name: "Scout" });

    await expect(
      test.runtime.check(parent(), { botId: BotId.make("@Scout") }),
    ).resolves.toMatchObject({ botId: CHILD_BOT_ID });

    await expect(test.runtime.stop(parent(), { botId: BotId.make("Scout") })).rejects.toThrow(
      "no active delegated work",
    );
  });

  it("names the valid members when the target is neither an ID nor a member name", async () => {
    const test = harness(groupSnapshot());

    const failure = await test.runtime.check(parent(), { botId: BotId.make("resume-writer") }).then(
      () => undefined,
      (cause: unknown) => cause,
    );

    expect(failure).toBeInstanceOf(IsnadiDelegationUnknownBotError);
    expect((failure as Error).message).toContain("'resume-writer'");
    expect((failure as Error).message).toContain(`Scout (${CHILD_BOT_ID})`);
    expect((failure as Error).message).not.toContain("Boss");
  });

  it("reports an unknown target as not_found and bills the calling bot, never the raw text", async () => {
    const members = [{ id: CHILD_BOT_ID, name: "Scout" }];

    const runtime = createIsnadiToolRuntime();
    runtime.registerSession("thread-unknown-target", {
      botId: PARENT_BOT_ID,
      runtimeMode: "full-access",
      workspaceType: "local",
      delegation: {
        depth: 0,
        activeDelegations: 0,
        access: {
          allowedToolIds: ["CheckAgent"],
          memoryScopes: [],
          sandbox: "local",
          runtimeMode: "full-access",
          hasUserComputer: false,
          enabledMcpServerIds: [],
          disabledMcpServerIds: [],
          approvalCeiling: "delete",
        },
        check: vi.fn(async () => {
          throw new IsnadiDelegationUnknownBotError({ requested: "resume-writer", members });
        }),
        send: vi.fn(),
      },
    });

    const receipt = await runtime.execute({
      threadId: "thread-unknown-target",
      toolId: "CheckAgent" as const,
      toolCallId: "check-unknown",
      input: { botId: BotId.make("resume-writer") },
      approvalMode: "require-grant" as const,
    });

    expect(receipt).toMatchObject({
      phase: "failure",
      failureCode: "not_found",
      billedBotId: PARENT_BOT_ID,
      summary: expect.stringContaining(`Scout (${CHILD_BOT_ID})`),
    });
  });
});
