import { AuthStorage } from "@mastra/code-sdk/auth/storage";
import { type ToolsInput } from "@mastra/core/agent";
import {
  AgentController as MastraAgentController,
  type MastraDBMessage,
  type Session,
} from "@mastra/core/agent-controller";
import {
  type IsnadiConversationMemorySnapshot,
  type BotPersonalityTone,
  type IsnadiCreateRoutineInput as IsnadiCreateRoutineInputValue,
} from "@isnadi/contracts";
import * as Duration from "effect/Duration";
import type { SubscriptionAuthService } from "../../subscription-auth/service.ts";
import type { IsnadiOpenCodeGoAccess } from "../IsnadiOpenCodeGoProvider.ts";
import { type IsnadiKimiAccess } from "../IsnadiKimiProvider.ts";
import type { IsnadiToolRuntime, IsnadiToolResult } from "../tools/IsnadiToolTypes.ts";
import {
  type IsnadiRoutineListResult,
  type IsnadiRoutineDeleteResult,
} from "./IsnadiRoutineSchemas.ts";

import type { IsnadiModelOptions } from "../ReasoningOptions.ts";
import type { GroupConversationState } from "./IsnadiGroupConversation.ts";

export interface IsnadiMastraState {
  readonly providerInstanceId?: string;
  // Undefined clears a previous directory when a reused session loses its cwd.
  readonly projectPath?: string | undefined;
  readonly yolo?: boolean;
  readonly botConversation?: boolean;
  readonly botName?: string;
  readonly personalityTone?: BotPersonalityTone;
  readonly persistentMemoryContext?: string;
  readonly mcpInstructions?: string;
  /** Set for group chats; rebuilt every turn. */
  readonly group?: GroupConversationState;
  readonly modelOptions?: IsnadiModelOptions;
}

export type IsnadiMastraSession = Session<IsnadiMastraState>;

/** Session methods used by Isnadi's injected controller boundary. */
export type IsnadiControllerSession = Pick<
  IsnadiMastraSession,
  | "subscribe"
  | "sendMessage"
  | "grantTool"
  | "abort"
  | "respondToToolApproval"
  | "respondToToolSuspension"
> & {
  readonly stream: Pick<IsnadiMastraSession["stream"], "isActive" | "waitForTeardown">;
  readonly run: Pick<IsnadiMastraSession["run"], "getRunId" | "waitForTeardown">;
  readonly state: Pick<IsnadiMastraSession["state"], "get" | "set">;
  readonly mode: Pick<IsnadiMastraSession["mode"], "get" | "switch">;
  readonly model: Pick<IsnadiMastraSession["model"], "get" | "switch">;
  readonly permissions: Pick<IsnadiMastraSession["permissions"], "setForCategory" | "setForTool">;
};

export interface IsnadiMastraHarnessOptions {
  readonly authStorage: AuthStorage;
  readonly getKimiAccess?: (
    instanceId?: string,
    threadId?: string,
  ) => Promise<IsnadiKimiAccess | undefined>;
  readonly getOpenCodeGoApiKey?: (
    instanceId?: string,
    threadId?: string,
  ) => Promise<IsnadiOpenCodeGoAccess | undefined>;
  readonly getSubscriptionApiKey?: SubscriptionAuthService["getApiKeyCredential"];
  readonly getSubscriptionOAuth?: SubscriptionAuthService["getOAuthCredential"];
  readonly getSubscriptionAccessToken?: SubscriptionAuthService["getAccessToken"];
  readonly getModelConnection?: (providerInstanceId: string) =>
    | {
        readonly environment: NodeJS.ProcessEnv;
        readonly instanceEnvironment: NodeJS.ProcessEnv;
        readonly useSavedCredential: boolean;
        readonly instanceId?: string;
      }
    | undefined;
  readonly memoryDbPath: string;
  /**
   * How long closing the harness waits for admitted memory work before it
   * interrupts that work. Defaults to five seconds.
   */
  readonly observationCloseGrace?: Duration.Input;
  readonly startMemoryCall?: (input: {
    readonly threadId: string;
    readonly category: "observer" | "reflector";
  }) => Promise<string | undefined>;
  readonly finishMemoryCall?: (input: {
    readonly callId: string;
    readonly category: "observer" | "reflector";
    readonly usage?: {
      readonly inputTokens?: number;
      readonly outputTokens?: number;
      readonly totalTokens?: number;
    };
    readonly error?: Error;
  }) => Promise<void>;
  readonly getThreadTools: (threadId: string) => ToolsInput;
  readonly syncThreadToolApproval?: (
    threadId: string,
    toolName: string,
    protectedAction: boolean,
  ) => Promise<void>;
  readonly toolRuntime: IsnadiToolRuntime;
  readonly createRoutine?: (
    threadId: string,
    input: IsnadiCreateRoutineInputValue,
  ) => Promise<IsnadiToolResult>;
  readonly listRoutines?: (threadId: string) => Promise<IsnadiRoutineListResult>;
  readonly deleteRoutines?: (
    threadId: string,
    routineIds: ReadonlyArray<string>,
  ) => Promise<IsnadiRoutineDeleteResult>;
  readonly onObservationDropped?: (input: {
    /** Stable queue-row id; retried notices reuse it. */
    readonly observationId: string;
    readonly threadId: string;
    readonly turnId?: string;
    readonly resourceId: string;
    readonly modelId: string;
    readonly attempts: number;
    readonly error: Error;
  }) => Promise<void> | void;
}

export type IsnadiControllerHarness = IsnadiMastraHarness<IsnadiControllerSession>;

export interface IsnadiMastraHarness<SessionType = IsnadiMastraSession> {
  readonly rebuildConversation?: (
    threadId: string,
    messages: ReadonlyArray<MastraDBMessage>,
  ) => Promise<() => Promise<void>>;
  readonly controller: Pick<MastraAgentController<IsnadiMastraState>, "init" | "deleteSession"> & {
    createSession(
      ...args: Parameters<MastraAgentController<IsnadiMastraState>["createSession"]>
    ): Promise<SessionType>;
  };
  readonly clearObservationalMemory?: (threadId: string, resourceId?: string) => Promise<void>;
  readonly readObservationalMemory?: (
    threadId: string,
    resourceId?: string,
  ) => Promise<IsnadiConversationMemorySnapshot>;
  readonly restoreObservationalMemory?: (
    threadId: string,
    snapshot: IsnadiConversationMemorySnapshot,
    resourceId?: string,
    expectedSnapshot?: IsnadiConversationMemorySnapshot,
  ) => Promise<void>;
  readonly observeAfterTurn?: (input: IsnadiBackgroundObservationInput) => Promise<void>;
  readonly observeExternalTurn?: (input: {
    readonly threadId: string;
    readonly turnId: string;
    readonly modelId: string;
    readonly userMessages: ReadonlyArray<{ readonly id: string; readonly text: string }>;
    readonly assistant: string;
    readonly createdAt: string;
    /** Set in a group chat: the bot that wrote `assistant`. */
    readonly respondingBotId?: string;
  }) => Promise<void>;
  readonly drainObservationQueue?: () => Promise<void>;
}

export interface IsnadiBackgroundObservationInput {
  readonly threadId: string;
  readonly resourceId?: string;
  readonly modelId: string;
  /** Routes the observer to this instance's own credentials. */
  readonly providerInstanceId?: string;
  readonly turnId?: string;
}

export type IsnadiMastraToolOptions = Pick<
  IsnadiMastraHarnessOptions,
  | "authStorage"
  | "getKimiAccess"
  | "getOpenCodeGoApiKey"
  | "getThreadTools"
  | "syncThreadToolApproval"
  | "toolRuntime"
  | "createRoutine"
  | "listRoutines"
  | "deleteRoutines"
>;
