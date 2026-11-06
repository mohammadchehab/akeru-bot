import type { GroupConversationState } from "../../mastra/IsnadiGroupConversation.ts";
import type { IsnadiPluginRuntimeOptions } from "../../IsnadiCatalogToolHandlers.ts";
import { ProviderDriverKind } from "@isnadi/contracts";
import { ProviderInstanceId } from "@isnadi/contracts";

import type { RuntimeMode } from "@isnadi/contracts";

import {
  TurnId,
  type BotPersonalityTone,
  type McpServer,
  type ModelSelection,
  type ProviderRuntimeEvent,
  type ProviderSession,
  ThreadId,
  type IsnadiMemoryThreadAccess,
  type OrchestrationReadModel,
} from "@isnadi/contracts";
import * as Deferred from "effect/Deferred";
import * as Semaphore from "effect/Semaphore";
import { type BotMemoryAccess } from "../../../memory/BotMemory.ts";
import { type IsnadiMemoryToolHandler } from "../../../memory/BotMemoryToolHandlers.ts";
import { type IsnadiControllerSession } from "../../mastra/IsnadiHarnessTypes.ts";
import { type IsnadiMemoryTurn } from "../../IsnadiMemoryTurnHarness.ts";
import { type IsnadiToolSession } from "../../IsnadiToolRuntime.ts";
import {
  type AgentControllerSendTurnInput,
  type AgentControllerShape,
} from "../../Services/AgentController.ts";

export type MastraSession = IsnadiControllerSession;

export interface ResolvedEngine {
  readonly modelSelection: ModelSelection;
  readonly provider: ProviderDriverKind;
  readonly providerInstanceId: ProviderInstanceId;
  readonly mastraModelId: string;
  readonly botConversation: boolean;
  readonly botName?: string;
  readonly personalityTone?: BotPersonalityTone;
}

export interface ActiveAssistantMessage {
  readonly messageId: string;
  text: string;
  publishedText: string;
  revision: number;
}

export interface ActiveTurn {
  readonly turnId: TurnId;
  readonly assistantMessages: Map<string, ActiveAssistantMessage>;
  waiting: boolean;
  /** Suspended tool calls still waiting for a user answer. */
  readonly suspendedToolCalls: Set<string>;
  finished: boolean;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  memoryQueued: boolean;
  assistantText: string;
}

export interface PendingTurn {
  /** The group this turn runs in, read when the turn was queued. */
  readonly group?: GroupConversationState;
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly message: Parameters<MastraSession["sendMessage"]>[0];
  readonly botUsage: AgentControllerSendTurnInput["botUsage"];
  readonly toolSession: IsnadiToolSession;
  readonly memoryAccess: BotMemoryAccess | undefined;
  readonly entityMemoryAccess: IsnadiMemoryThreadAccess | undefined;
  readonly reviewInput: string;
  readonly hiddenWake: boolean;
  readonly delegationResults: string | undefined;
}

export interface ActiveSession {
  startInput: Parameters<AgentControllerShape["startSession"]>[1];
  readonly session: MastraSession;
  readonly turnPreparation: Semaphore.Semaphore;
  /** Follow the model the router picked for the turn, so events name the model that ran it. */
  provider: ProviderDriverKind;
  providerInstanceId: ProviderInstanceId;
  cwd: string | undefined;
  readonly createdAt: string;
  readonly mcpServerIds: readonly McpServer["id"][];
  readonly mcpServers: readonly McpServer[];
  runtimeMode: RuntimeMode;
  model: string;
  status: ProviderSession["status"];
  turnAdmissionGeneration: number;
  /** Completes when the current admission generation ends, cancelling turns still preparing. */
  turnPreparationCancelled: Deferred.Deferred<void>;
  activeTurn: ActiveTurn | null;
  admittingTurn: PendingTurn | null;
  readonly pendingTurns: PendingTurn[];
  readonly pendingDispatches: Set<Promise<void>>;
  readonly toolNames: Map<string, string>;
  readonly approvalRequests: Map<string, { readonly name: string; readonly input: unknown }>;
  readonly connectorSessionApprovals: Set<string>;
  toolSession: IsnadiToolSession;
  memoryAccess: BotMemoryAccess | undefined;
  entityMemoryAccess: IsnadiMemoryThreadAccess | undefined;
  configuredToolSession: IsnadiToolSession;
  configuredMemoryAccess: BotMemoryAccess | undefined;
  configuredEntityMemoryAccess: IsnadiMemoryThreadAccess | undefined;
  privateBotMemory: boolean;
  readonly workspaceResourceKey: string;
  readonly pendingApprovals: Map<string, PendingApproval>;
  readonly unsubscribe: () => void;
}

export interface PendingApproval {
  readonly toolName: string;
  readonly action: string;
}

export interface LegacyTurnMemoryState {
  readonly observationPromptId: string;
  observationRecorded: boolean;
  readonly seenEventIds: Set<string>;
  readonly user: string;
  readonly modelId: string;
  turnId: string | undefined;
  dispatchReturned: boolean;
  readonly earlyEvents: Array<ProviderRuntimeEvent>;
  assistant: string;
  readonly memoryTurn: IsnadiMemoryTurn | undefined;
  readonly hiddenWake: boolean;
  priorMemoryHandler?: IsnadiMemoryToolHandler;
  reviewMemoryHandler?: IsnadiMemoryToolHandler;
}

export interface LegacyResourceIdentity {
  readonly workspaceResourceKey: string;
  readonly cwd: string | undefined;
  readonly provider: ProviderDriverKind;
  readonly providerInstanceId: ProviderInstanceId;
  memoryAccess: BotMemoryAccess | undefined;
  entityMemoryAccess: IsnadiMemoryThreadAccess | undefined;
  readonly botName: string | undefined;
  /** The bot answering on this session; a group restarts the session when the responder changes. */
  readonly botId?: string | undefined;
  readonly personalityTone: BotPersonalityTone;
  readonly memoryAccessKey: string | undefined;
  privateBotMemory: boolean;
}

/** Orchestration access for temporary workers and delegation. */
export interface WorkerOrchestration {
  readonly readSnapshot: () => Promise<OrchestrationReadModel>;
  readonly dispatch: IsnadiPluginRuntimeOptions["dispatch"];
}
