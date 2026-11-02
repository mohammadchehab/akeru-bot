import type { Tool } from "@mastra/core/tools";
import { type Workspace } from "@mastra/core/workspace";
import {
  type IsnadiDelegationAccessGrant,
  IsnadiToolInputSchemas,
  type BotId,
  type IsnadiToolId,
  type IsnadiToolReceipt,
  type IsnadiToolWorkspaceType,
  type IsnadiWorkerStatus,
  type RuntimeMode,
} from "@isnadi/contracts";
import type { UserActionIncidentInput } from "../../bot-inbox/userActionIncidents.ts";
import {
  type IsnadiMemoryToolHandler,
  type IsnadiMemoryToolId,
} from "../../memory/BotMemoryToolHandlers.ts";
import type { IsnadiCatalogToolHandler } from "./IsnadiCatalogTypes.ts";
import type { IsnadiBotStateRuntime } from "../IsnadiBotStateRuntime.ts";

/** Native and plugin tools use the SDK result contract until tool-specific processing. */
export type IsnadiToolResult = Awaited<ReturnType<NonNullable<Tool["execute"]>>>;

export type IsnadiRuntimeToolId = IsnadiToolId | IsnadiMemoryToolId;

export interface IsnadiRuntimeToolDefinition {
  readonly id: IsnadiRuntimeToolId;
  readonly description: string;
}

export interface IsnadiToolSession {
  readonly botId?: BotId;
  readonly botName?: string;
  readonly billedBotId?: BotId;
  readonly runtimeMode: RuntimeMode;
  readonly workspaceType: IsnadiToolWorkspaceType;
  readonly timezone?: string;
  readonly workspace?: Workspace;
  readonly userComputerWorkspace?: Workspace;
  readonly memoryHandlers?: Record<IsnadiMemoryToolId, IsnadiMemoryToolHandler>;
  readonly delegation?: {
    readonly depth: number;
    readonly activeDelegations: number;
    readonly access: IsnadiDelegationAccessGrant;
    readonly create?: (
      input: (typeof IsnadiToolInputSchemas.CreateAgent)["Type"],
    ) => Promise<IsnadiToolResult>;
    readonly check?: (
      input: (typeof IsnadiToolInputSchemas.CheckAgent)["Type"],
    ) => Promise<IsnadiToolResult>;
    readonly send: (
      input: (typeof IsnadiToolInputSchemas.SendToAgent)["Type"],
    ) => Promise<IsnadiToolResult>;
    readonly stop?: (
      input: (typeof IsnadiToolInputSchemas.StopAgent)["Type"],
    ) => Promise<IsnadiToolResult>;
  };
  /** Temporary workers owned by this bot turn. Worker threads never get this. */
  readonly workers?: {
    readonly depth: number;
    readonly spawn: (
      input: (typeof IsnadiToolInputSchemas.Task)["Type"],
    ) => Promise<IsnadiWorkerStatus>;
    readonly check: (
      input: (typeof IsnadiToolInputSchemas.CheckSubagent)["Type"],
    ) => Promise<IsnadiWorkerStatus>;
    readonly message: (
      input: (typeof IsnadiToolInputSchemas.MessageSubagent)["Type"],
    ) => Promise<IsnadiWorkerStatus>;
    readonly stop: (
      input: (typeof IsnadiToolInputSchemas.StopSubagent)["Type"],
    ) => Promise<IsnadiWorkerStatus>;
  };
  readonly channels?: {
    readonly create: (
      input: (typeof IsnadiToolInputSchemas.CreateChannel)["Type"],
    ) => Promise<string>;
    readonly update: (
      input: (typeof IsnadiToolInputSchemas.UpdateChannel)["Type"],
    ) => Promise<string>;
  };
  readonly sendToUser?: (
    input: (typeof IsnadiToolInputSchemas.SendToUser)["Type"],
  ) => Promise<IsnadiToolReceipt>;
  readonly botState?: Pick<IsnadiBotStateRuntime, "updateProfile">;
  readonly reactToMessage?: (
    input: (typeof IsnadiToolInputSchemas.ReactToMessage)["Type"],
    toolCallId: string,
  ) => Promise<IsnadiToolResult>;
  readonly catalogHandlers?: Partial<Record<IsnadiToolId, IsnadiCatalogToolHandler>>;
  /** Image providers enabled in Settings; gates the GenerateImage tool. */
  readonly imageGeneration?: { readonly chatgptEnabled: boolean; readonly grokEnabled: boolean };
}

export interface IsnadiToolRuntimeOptions {
  readonly onUserActionRequired?: (input: UserActionIncidentInput) => void | Promise<void>;
  readonly onReceipt?: (receipt: IsnadiToolReceipt) => void;
  readonly onProgress?: (input: {
    readonly threadId: string;
    readonly toolId: IsnadiToolId;
    readonly toolCallId: string;
    readonly summary: string;
    readonly authorizationUrl?: string;
  }) => void | Promise<void>;
  readonly now?: () => string;
  readonly onToolStart?: (input: IsnadiToolExecution, session: IsnadiToolSession) => Promise<void>;
  readonly onToolFinish?: (input: IsnadiToolExecution, session: IsnadiToolSession) => Promise<void>;
}

export interface IsnadiToolExecution {
  readonly threadId: string;
  readonly toolId: IsnadiRuntimeToolId;
  readonly toolCallId: string;
  readonly input: unknown;
  readonly approvalMode: "require-grant";
}

export interface IsnadiToolRuntime {
  readonly registerSession: (threadId: string, session: IsnadiToolSession) => void;
  readonly unregisterSession: (threadId: string) => void;
  readonly clearApprovals: (threadId: string) => void;
  readonly toolsForThread: (threadId: string) => ReadonlyArray<IsnadiRuntimeToolDefinition>;
  readonly requiresApproval: (
    threadId: string,
    toolId: IsnadiRuntimeToolId,
    input: IsnadiToolExecution["input"],
  ) => Promise<boolean>;
  readonly grantApproval: (input: Omit<IsnadiToolExecution, "approvalMode">) => void;
  readonly execute: (input: IsnadiToolExecution) => Promise<IsnadiToolResult>;
}
