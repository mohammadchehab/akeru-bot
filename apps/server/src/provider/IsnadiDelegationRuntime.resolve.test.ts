import { BotId, GroupId } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  IsnadiDelegationAmbiguousBotError,
  IsnadiDelegationUnknownBotError,
} from "./delegation/IsnadiDelegationPolicy.ts";
import {
  CHILD_BOT_ID,
  NOW,
  OTHER_BOT_ID,
  PARENT_BOT_ID,
  PARENT_THREAD_ID,
  bot,
  harness,
  parent,
  request,
  snapshot,
  thread,
} from "./testUtils/delegationHarness.ts";

const send = (test: ReturnType<typeof harness>, botId: string) =>
  test.runtime.send(parent(), { ...request(), botId: BotId.make(botId) } as never);

const failureOf = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (cause: unknown) => cause,
  );

const direct = (overrides: Parameters<typeof bot>[1] = {}) =>
  harness(
    snapshot({
      bots: [
        bot(PARENT_BOT_ID, { name: "Boss" }),
        bot(CHILD_BOT_ID, { name: "Scout", label: "Researcher", ...overrides }),
      ],
    }),
  );

describe("SendToAgent target resolution", () => {
  it("accepts a bot ID", async () => {
    await expect(send(direct(), CHILD_BOT_ID)).resolves.toMatchObject({ childBotId: CHILD_BOT_ID });
  });

  it("accepts an exact name, ignoring case and a leading @", async () => {
    await expect(send(direct(), "Scout")).resolves.toMatchObject({ childBotId: CHILD_BOT_ID });
    await expect(send(direct(), "scout")).resolves.toMatchObject({ childBotId: CHILD_BOT_ID });
    await expect(send(direct(), "@SCOUT")).resolves.toMatchObject({ childBotId: CHILD_BOT_ID });
  });

  it("falls back to an exact label when no name matches", async () => {
    await expect(send(direct(), "researcher")).resolves.toMatchObject({
      childBotId: CHILD_BOT_ID,
    });
  });

  it("stores the resolved bot ID on the delegation, never the typed name", async () => {
    const test = direct();
    await send(test, "Scout");
    await test.runtime.drain();

    const create = test.commands.find((command) => command.type === "thread.create");
    expect(create).toMatchObject({ botId: CHILD_BOT_ID });
    expect(JSON.stringify(test.commands)).not.toContain('"botId":"Scout"');
  });

  it("refuses two reachable bots with the same name and lists both", async () => {
    const test = harness(
      snapshot({
        bots: [
          bot(PARENT_BOT_ID, { name: "Boss" }),
          bot(CHILD_BOT_ID, { name: "Scout" }),
          bot(OTHER_BOT_ID, { name: "scout" }),
        ],
      }),
    );

    const failure = await failureOf(send(test, "Scout"));

    expect(failure).toBeInstanceOf(IsnadiDelegationAmbiguousBotError);
    expect((failure as Error).message).toContain(`Scout (${CHILD_BOT_ID})`);
    expect((failure as Error).message).toContain(`scout (${OTHER_BOT_ID})`);
    expect(test.commands).toEqual([]);
  });

  it("lists the reachable bots when nothing matches", async () => {
    const failure = await failureOf(send(direct(), "Nobody"));

    expect(failure).toBeInstanceOf(IsnadiDelegationUnknownBotError);
    expect((failure as Error).message).toContain(`Scout (${CHILD_BOT_ID})`);
    expect((failure as Error).message).not.toContain("Boss");
  });

  it("never reveals or matches a same-named bot outside the group", async () => {
    const groupId = GroupId.make("group-1");

    const test = harness(
      snapshot({
        bots: [
          bot(PARENT_BOT_ID, { groupId, name: "Boss" }),
          bot(CHILD_BOT_ID, { groupId, name: "Scout" }),
          bot(OTHER_BOT_ID, { name: "Outsider" }),
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
      }),
    );

    const failure = await failureOf(send(test, "Outsider"));

    expect(failure).toBeInstanceOf(IsnadiDelegationUnknownBotError);
    expect((failure as Error).message).not.toContain("Outsider (");
    expect((failure as Error).message).toContain(`Scout (${CHILD_BOT_ID})`);
  });

  it("does not resolve an archived bot by name", async () => {
    const failure = await failureOf(send(direct({ archivedAt: NOW }), "Scout"));

    expect(failure).toBeInstanceOf(IsnadiDelegationUnknownBotError);
  });

  it("still reports an archived bot given by ID as unavailable", async () => {
    await expect(send(direct({ archivedAt: NOW }), CHILD_BOT_ID)).rejects.toThrow(
      "The target bot is not available in this workspace.",
    );
  });
});
