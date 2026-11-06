import type { IsnadiControllerHarness } from "../../mastra/IsnadiHarnessTypes.ts";
import { runImageGenerationTool } from "../../../image-generation/ImageGenerationRuntime.ts";
import { createMcpManager } from "@mastra/code-sdk/mcp/index";

import { Workspace } from "@mastra/core/workspace";

import type { ModelSelection } from "@isnadi/contracts";
import * as Effect from "effect/Effect";

import type * as Scope from "effect/Scope";

import { BotMemoryStore } from "../../../memory/BotMemory.ts";

import { type EntityMemoryRepositoryShape } from "../../../memory/Services/EntityMemoryRepository.ts";

import * as McpSessionRegistry from "../../../mcp/McpSessionRegistry.ts";

import {
  type IsnadiMastraHarnessError,
  type IsnadiMastraHarnessOptions,
} from "../../IsnadiMastraHarness.ts";

import { type IsnadiDelegationRuntime } from "../../IsnadiDelegationRuntime.ts";

import { type IsnadiWebFetchOptions } from "../../IsnadiWebFetch.ts";

import type { BotBrowser, CreateBotBrowserInput } from "../../botBrowser.ts";

import { resolveCodexComputerUseServer } from "../../CodexComputerUse.ts";
import { type IsnadiBotWorkspace, type CreateRemoteBotWorkspaceInput } from "../../botWorkspace.ts";

export interface AgentControllerLiveOptions {
  /**
   * When a model is paused (for example by a spent usage limit), the epoch
   * milliseconds it comes back. The router skips a paused model.
   */
  readonly modelPausedUntil?: (selection: ModelSelection) => Effect.Effect<number | undefined>;
  /** Builds the harness in the layer scope; closing the scope shuts it down. */
  readonly makeMastraHarness?: (
    options: IsnadiMastraHarnessOptions,
  ) => Effect.Effect<IsnadiControllerHarness, IsnadiMastraHarnessError, Scope.Scope>;
  readonly makeMcpManager?: typeof createMcpManager;
  readonly makeRemoteWorkspace?: (
    input: CreateRemoteBotWorkspaceInput,
  ) => Promise<IsnadiBotWorkspace | Workspace>;
  readonly makeBotBrowser?: (input: CreateBotBrowserInput) => BotBrowser;
  readonly resolveComputerUseServer?: typeof resolveCodexComputerUseServer;
  readonly issueMcpCredential?: typeof McpSessionRegistry.issueActiveMcpCredential;
  readonly revokeMcpCredential?: typeof McpSessionRegistry.revokeActiveMcpThread;
  readonly entityMemoryRepository?: EntityMemoryRepositoryShape;
  readonly botMemoryStore?: BotMemoryStore;
  readonly delegationRuntime?: Pick<
    IsnadiDelegationRuntime,
    "send" | "sendToUser" | "parentFinished" | "accessForThread"
  > &
    Partial<Pick<IsnadiDelegationRuntime, "create" | "check" | "stop" | "dispatchDelegation">>;
  readonly readAttachment?: (path: string) => Promise<Uint8Array>;
  /** Overrides the WebFetch resolver and address policy in tests. */
  readonly webFetch?: IsnadiWebFetchOptions;
  /**
   * Overrides the image generation entry for tests. Defaults to
   * `runImageGenerationTool`, which calls the active ImageGenerationRuntime.
   */
  readonly generateImage?: (
    threadId: Parameters<typeof runImageGenerationTool>[0],
    input: Parameters<typeof runImageGenerationTool>[1],
  ) => Effect.Effect<unknown>;
}
