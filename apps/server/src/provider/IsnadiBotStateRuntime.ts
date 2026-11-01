import * as NodeCrypto from "node:crypto";

import {
  CommandId,
  ThreadId,
  type IsnadiToolInputSchemas,
  type IsnadiToolReceipt,
  type BotId,
  type OrchestrationCommand,
  type OrchestrationReadModel,
} from "@isnadi/contracts";
import * as DateTime from "effect/DateTime";

export interface IsnadiBotStateRuntimeOptions {
  readonly readSnapshot: () => Promise<OrchestrationReadModel>;
  readonly dispatch: (command: OrchestrationCommand) => Promise<{ readonly sequence: number }>;
  readonly now?: () => string;
  readonly id?: () => string;
}

export function createIsnadiBotStateRuntime(options: IsnadiBotStateRuntimeOptions) {
  const now = options.now ?? (() => DateTime.formatIso(DateTime.nowUnsafe()));
  const id = options.id ?? (() => NodeCrypto.randomUUID());

  const updateProfile = async (
    threadId: ThreadId,
    botId: BotId,
    toolCallId: string,
    input: (typeof IsnadiToolInputSchemas.UpdateBotProfile)["Type"],
  ): Promise<IsnadiToolReceipt> => {
    const snapshot = await options.readSnapshot();
    const bot = snapshot.bots.find((candidate) => candidate.id === botId);

    if (!bot || bot.archivedAt !== null) throw new Error("This bot is not available.");

    const createdAt = now();

    const result = await options.dispatch({
      type: "bot.update",
      commandId: CommandId.make(`bot-state:profile:${id()}`),
      botId,
      ...input,
    });

    return {
      receiptId: toolCallId,
      toolId: "UpdateBotProfile",
      phase: "success",
      threadId,
      botId,
      summary: `Bot profile updated at event sequence ${result.sequence}.`,
      fatalToThread: false,
      billedBotId: botId,
      createdAt,
    };
  };

  return { updateProfile };
}

export type IsnadiBotStateRuntime = ReturnType<typeof createIsnadiBotStateRuntime>;
