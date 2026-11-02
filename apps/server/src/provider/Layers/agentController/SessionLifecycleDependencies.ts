import type { IsnadiModelOptions } from "../../ReasoningOptions.ts";
import type { IsnadiControllerHarness } from "../../mastra/IsnadiHarnessTypes.ts";
import { ProviderDriverKind } from "@isnadi/contracts";
import { ProviderInstanceId } from "@isnadi/contracts";
import { isnadiToolCategory } from "../../IsnadiMastraHarness.ts";
import type { createIsnadiWebFetch } from "../../IsnadiWebFetch.ts";
import type { IsnadiToolRuntime } from "../../IsnadiToolRuntime.ts";
import type { ProviderServiceError } from "../../Errors.ts";
import type { RuntimeMode } from "@isnadi/contracts";
import type { IsnadiRuntimeSeam } from "../../IsnadiRuntimeSeam.ts";
import type { AgentControllerLiveOptions } from "./Options.ts";

import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import {
  EventId,
  TurnId,
  type BotId,
  type ProviderRuntimeEvent,
  type ProviderSession,
  ThreadId,
  type IsnadiDelegationAccessGrant,
  type IsnadiDelegationRecord,
  type IsnadiMemoryThreadAccess,
} from "@isnadi/contracts";

import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { BotInboxService } from "../../../bot-inbox/service.ts";
import { BotMemoryStore, type BotMemoryAccess } from "../../../memory/BotMemory.ts";
import { type IsnadiMemoryToolHandler } from "../../../memory/BotMemoryToolHandlers.ts";

import { ProjectionSnapshotQuery } from "../../../orchestration/Services/ProjectionSnapshotQuery.ts";

import { SubscriptionAuthService } from "../../../subscription-auth/service.ts";

import { type IsnadiChannelRuntime } from "../../IsnadiChannelRuntime.ts";
import { type IsnadiBotStateRuntime } from "../../IsnadiBotStateRuntime.ts";
import type { IsnadiWorkerRuntime } from "../../IsnadiWorkerRuntime.ts";
import {
  createIsnadiPluginRuntime,
  type IsnadiPluginRuntimeOptions,
} from "../../IsnadiCatalogToolHandlers.ts";

import { type IsnadiToolSession } from "../../IsnadiToolRuntime.ts";
import { IsnadiSessionResources } from "../../IsnadiSessionResources.ts";

import { AgentControllerRuntimeError, ProviderValidationError } from "../../Errors.ts";

import { LegacyProviderBridge } from "../../Services/LegacyProviderBridge.ts";
import {
  type ResolvedEngine,
  type ActiveSession,
  type LegacyResourceIdentity,
  type WorkerOrchestration,
} from "./State.ts";

export interface SessionLifecycleDependencies {
  readonly webFetch: ReturnType<typeof createIsnadiWebFetch>;
  readonly runPromise: IsnadiRuntimeSeam["runPromise"];
  readonly projectionSnapshotQuery: Option.Option<ProjectionSnapshotQuery["Service"]>;
  readonly workerRuntime: IsnadiWorkerRuntime;
  readonly wired: () => {
    readonly channelRuntime?: IsnadiChannelRuntime;
    readonly pluginRuntime?: ReturnType<typeof createIsnadiPluginRuntime>;
    readonly pluginRuntimeOptions?: IsnadiPluginRuntimeOptions;
    readonly botStateRuntime?: IsnadiBotStateRuntime;
    readonly delegationRuntime?: AgentControllerLiveOptions["delegationRuntime"];
    readonly workerOrchestration?: WorkerOrchestration;
  };
  readonly sessions: Map<string, ActiveSession>;
  readonly resolvedByThread: Map<string, ResolvedEngine>;
  readonly usesMastraCode: (provider: ProviderDriverKind) => boolean;
  readonly legacyProviderBridge: LegacyProviderBridge["Service"];
  readonly disabledProviderError: (
    operation: string,
    providerInstanceId: ProviderInstanceId,
  ) => ProviderValidationError;
  readonly options: AgentControllerLiveOptions | undefined;
  readonly botMemoryStore: BotMemoryStore;
  readonly failureDetail: (cause: unknown) => string;
  readonly runMastra: <A>(
    operation: string,
    run: (signal: AbortSignal) => Promise<A>,
  ) => Effect.Effect<A, AgentControllerRuntimeError, never>;
  readonly imageToolSettings: Effect.Effect<
    { chatgptEnabled: boolean; grokEnabled: boolean },
    never,
    never
  >;
  readonly memorySettings: () =>
    | Effect.Effect<
        | { enabled: boolean; privateBotMemory: boolean; sharedProjectMemory: "auto" | "ask" }
        | { enabled: boolean; privateBotMemory: boolean; sharedProjectMemory: "ask" },
        never,
        never
      >
    | Effect.Effect<
        {
          readonly enabled: true;
          readonly privateBotMemory: true;
          readonly sharedProjectMemory: "ask";
        },
        never,
        never
      >;
  readonly memoryHandlers: (
    access: IsnadiMemoryThreadAccess | undefined,
    allowedScopes: IsnadiDelegationAccessGrant["memoryScopes"],
  ) => { memory: IsnadiMemoryToolHandler } | undefined;
  readonly delegationFor: (input: {
    readonly threadId: ThreadId;
    readonly botId: BotId;
    readonly parentDelegation: IsnadiDelegationRecord | undefined;
    readonly access: IsnadiDelegationAccessGrant;
    readonly activeChildDelegations: number;
  }) => NonNullable<IsnadiToolSession["delegation"]>;
  readonly workersFor: (
    threadId: ThreadId,
    access: IsnadiDelegationAccessGrant,
  ) => NonNullable<IsnadiToolSession["workers"]>;
  readonly memoryAccessFor: (
    access: IsnadiMemoryThreadAccess | undefined,
  ) => BotMemoryAccess | undefined;
  readonly toolRuntime: IsnadiToolRuntime;
  readonly toProviderSession: (threadId: ThreadId, active: ActiveSession) => ProviderSession;
  readonly legacyResourceIdentity: Map<string, LegacyResourceIdentity>;
  readonly memoryAccessKey: (access: BotMemoryAccess | undefined) => string | undefined;
  readonly sessionResources: IsnadiSessionResources;
  readonly stopSessionWithResources: (
    input: { readonly threadId: ThreadId },
    destroyResources: boolean,
  ) => Effect.Effect<void, ProviderServiceError | AgentControllerRuntimeError, never>;
  readonly preparePreviewMcpSession: (
    threadId: ThreadId,
    providerInstanceId: ProviderInstanceId,
    memoryHandler?: IsnadiMemoryToolHandler,
  ) => Effect.Effect<void, never, never>;
  readonly clearPreviewMcpSession: (threadId: ThreadId) => Effect.Effect<void, never, never>;
  readonly entityMemoryContext: (access: IsnadiMemoryThreadAccess | undefined) => Promise<string>;
  readonly subscriptionAuth: SubscriptionAuthService;
  readonly botInbox: BotInboxService;
  readonly deleteCatalogMcpServer: (
    runtime: Pick<IsnadiPluginRuntimeOptions, "readSnapshot" | "dispatch">,
    serverId: string,
    commandPrefix: "mcp-delete" | "mcp-remove",
  ) => Promise<{
    serverId: string;
    removed: boolean;
    dependentBots: { id: BotId; name: string }[];
    clearedDisabledFor: { id: BotId; name: string }[];
  }>;
  readonly bundle: IsnadiControllerHarness;
  readonly mastraModelOptions: (resolved: ResolvedEngine) => IsnadiModelOptions | undefined;
  readonly DEFAULT_MODE_ID: string;
  readonly permissionPolicy: (
    runtimeMode: RuntimeMode,
    category: ReturnType<typeof isnadiToolCategory>,
  ) => "allow" | "ask";
  readonly handleControllerEvent: (
    threadId: ThreadId,
    active: ActiveSession,
    event: AgentControllerEvent,
  ) => void;
  readonly publish: (event: ProviderRuntimeEvent) => void;
  readonly baseEvent: (
    threadId: ThreadId,
    active: Pick<ActiveSession, "provider" | "providerInstanceId">,
    turnId?: TurnId,
  ) => {
    turnId?: TurnId;
    eventId: EventId;
    provider: ProviderDriverKind;
    providerInstanceId: ProviderInstanceId;
    threadId: ThreadId;
    createdAt: string;
  };
  readonly publishSessionState: (
    threadId: ThreadId,
    active: ActiveSession,
    state: "ready" | "running" | "waiting" | "stopped" | "error",
    reason?: string,
  ) => void;
}
