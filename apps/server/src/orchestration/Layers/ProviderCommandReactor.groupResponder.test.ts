import {
  AuthSessionId,
  BotId,
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  GroupId,
  ProviderInstanceId,
  ThreadId,
} from "@isnadi/contracts";
import { createModelSelection } from "@isnadi/shared/model";
import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  asMessageId,
  asProjectId,
  asTurnId,
  createProviderCommandHarness,
} from "./test-support/ProviderCommandHarness.ts";

const NOW = "2026-01-01T00:00:00.000Z";

const BOSS = BotId.make("bot-1");

const SPECIALIST = BotId.make("bot-2");

const GROUP_THREAD = ThreadId.make("thread-group");

const PERSON = AuthSessionId.make("session-person");

const ENGINE = { provider: "codex", model: "gpt-5.6-sol" };

describe("ProviderCommandReactor group responder", () => {
  const testScope = createProviderCommandHarness();
  const { createHarness } = testScope;
  afterEach(testScope.dispose);

  // Boss and specialist share engine, runtime mode and MCP set, so only the responder differs.
  async function createGroupHarness() {
    const harness = await createHarness({
      botEngine: ENGINE,
      secondBot: { engine: ENGINE },
      botSandboxBrowserSharing: "shared",
    });

    await harness.run(
      harness.engine.dispatch({
        type: "group.create",
        commandId: CommandId.make("cmd-group-create"),
        groupId: GroupId.make("group-1"),
        name: "Job Hunt",
        bossBotId: BOSS,
        specialistBotIds: [SPECIALIST],
        creator: { kind: "person", personId: PERSON, displayName: "Leo" },
        createdAt: NOW,
      }),
    );
    await harness.run(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.make("cmd-group-thread-create"),
        threadId: GROUP_THREAD,
        projectId: asProjectId("project-1"),
        groupId: GroupId.make("group-1"),
        title: "Group thread",
        modelSelection: createModelSelection(ProviderInstanceId.make("codex"), ENGINE.model),
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: NOW,
      }),
    );

    const sendTurn = (key: string, text: string, respondingBotId?: BotId) =>
      harness.run(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.make(`cmd-${key}`),
          threadId: GROUP_THREAD,
          message: {
            messageId: asMessageId(`msg-${key}`),
            role: "user",
            text,
            attachments: [],
          },
          senderPersonId: PERSON,
          ...(respondingBotId ? { respondingBotId } : {}),
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "approval-required",
          createdAt: NOW,
        }),
      );

    return { harness, sendTurn };
  }

  it("restarts the session as the mentioned bot", async () => {
    const { harness, sendTurn } = await createGroupHarness();

    await sendTurn("group-1", "hello");
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls.map((call) => call[1])).toMatchObject([{ botId: BOSS }]);

    await sendTurn("group-2", "@Second bot hi", SPECIALIST);
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 2);

    expect(harness.startSession.mock.calls.length).toBe(2);
    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({
      botId: SPECIALIST,
      botName: "Second bot",
    });
  });

  it("keeps the resume cursor so the mentioned bot still sees earlier group messages", async () => {
    const { harness, sendTurn } = await createGroupHarness();

    await sendTurn("group-1", "hello");
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await sendTurn("group-2", "@Second bot hi", SPECIALIST);
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 2);

    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({
      threadId: GROUP_THREAD,
      botId: SPECIALIST,
      resumeCursor: { opaque: "resume-1" },
    });
  });

  it("starts one session for consecutive turns to the same responder", async () => {
    const { harness, sendTurn } = await createGroupHarness();

    await sendTurn("group-1", "@Second bot one", SPECIALIST);
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await sendTurn("group-2", "@Second bot two", SPECIALIST);
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 2);

    expect(harness.startSession.mock.calls.length).toBe(1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({ botId: SPECIALIST });
  });

  it("defers the responder change until the active turn ends", async () => {
    const { harness, sendTurn } = await createGroupHarness();

    await sendTurn("group-1", "hello");
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 1);

    const [session] = harness.runtimeSessions;

    if (!session) throw new Error("Expected a runtime session");

    harness.runtimeSessions[0] = { ...session, activeTurnId: asTurnId("turn-busy") };

    await sendTurn("group-2", "@Second bot hi", SPECIALIST);
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.startSession.mock.calls.length).toBe(1);

    harness.runtimeSessions[0] = session;

    await sendTurn("group-3", "@Second bot again", SPECIALIST);
    await harness.waitFor(() => harness.startSession.mock.calls.length === 2);
    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({ botId: SPECIALIST });
  });
});
