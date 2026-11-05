import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  ProviderInstanceId,
  ThreadId,
} from "@isnadi/contracts";
import { createModelSelection } from "@isnadi/shared/model";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  asMessageId,
  createProviderCommandHarness,
} from "./test-support/ProviderCommandHarness.ts";

// Cursor runs its CLI on the environment host, so a bot with a remote sandbox must be refused at
// session start (and not silently work on the host, possibly with --force).
describe("ProviderCommandReactor with a Cursor bot", () => {
  const testScope = createProviderCommandHarness();
  const { createHarness } = testScope;
  afterEach(testScope.dispose);

  const cursor = createModelSelection(ProviderInstanceId.make("cursor"), "auto");

  const startTurn = (
    harness: Awaited<ReturnType<typeof createHarness>>,
    runtimeMode: "auto" | "full-access",
  ) =>
    harness.run(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.make("cmd-turn-start-cursor"),
        threadId: ThreadId.make("thread-1"),
        message: {
          messageId: asMessageId("user-message-cursor"),
          role: "user",
          text: "hello",
          attachments: [],
        },
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        runtimeMode,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );

  it("refuses a remote sandbox with a visible turn failure and never starts a session", async () => {
    const harness = await createHarness({
      threadModelSelection: cursor,
      botEngine: { provider: "cursor", model: "auto", fallbacks: [] },
      botSandbox: "daytona",
    });

    // Full access is the dangerous case: it would become --force on the host.
    await startTurn(harness, "full-access");

    await harness.waitFor(async () => {
      const readModel = await harness.readModel();
      const thread = readModel.threads.find((entry) => entry.id === ThreadId.make("thread-1"));

      return (
        thread?.activities.some((activity) => activity.kind === "provider.turn.start.failed") ??
        false
      );
    });

    const readModel = await harness.readModel();
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.make("thread-1"));

    expect(
      thread?.activities.find((activity) => activity.kind === "provider.turn.start.failed"),
    ).toMatchObject({
      payload: { detail: expect.stringContaining("'daytona' sandbox") },
    });
    expect(harness.startSession).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("starts normally for a Cursor bot on the local workspace", async () => {
    const harness = await createHarness({
      threadModelSelection: cursor,
      botEngine: { provider: "cursor", model: "auto", fallbacks: [] },
      botSandbox: "local",
    });

    await startTurn(harness, "auto");
    await harness.waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(harness.startSession).toHaveBeenCalledTimes(1);
  });
});
