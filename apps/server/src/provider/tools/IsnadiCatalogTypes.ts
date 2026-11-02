import type { IsnadiToolResult } from "./IsnadiToolTypes.ts";
import { type IsnadiToolInputSchemas } from "@isnadi/contracts";
import type { McpManager } from "@mastra/code-sdk/mcp/index";
import {
  type BotId,
  type ComposioToolkit,
  type OrchestrationCommand,
  type OrchestrationReadModel,
} from "@isnadi/contracts";
import type { RequestHealthStatus } from "../../subscription-auth/service.ts";

export interface IsnadiCatalogToolHandlerInput {
  readonly input: unknown;
  readonly emitProgress: (
    summary: string,
    details?: { readonly authorizationUrl?: string },
  ) => void | Promise<void>;
}

export type IsnadiCatalogToolHandler = (
  input: IsnadiCatalogToolHandlerInput,
) => Promise<IsnadiToolResult>;

export interface IsnadiMcpDependencies {
  readonly dependentBots: ReadonlyArray<{ readonly id: BotId; readonly name: string }>;
  readonly dependentRoutines: ReadonlyArray<string>;
}

export interface IsnadiMcpHealthHandlerOptions {
  readonly getRequestHealth: (serverId: string) => RequestHealthStatus | undefined;
  readonly recordSuccess: (serverId: string, at: string) => void;
  readonly recordFailure: (serverId: string, message: string, at: string) => void;
  readonly getDependencies: (serverId: string) => Promise<IsnadiMcpDependencies>;
  readonly onFailure?: (
    serverId: string,
    message: string,
    dependencies: IsnadiMcpDependencies,
  ) => void | Promise<void>;
  readonly onRecovery?: (
    serverId: string,
    dependencies: IsnadiMcpDependencies,
  ) => void | Promise<void>;
  readonly authenticationExpiresAt?: (serverId: string) => string | undefined;
  readonly now?: () => string;
}

export type McpRuntimeStatus = ReturnType<McpManager["getServerStatuses"]>[number];

export interface IsnadiPluginRuntimeOptions {
  readonly readSnapshot: () => Promise<OrchestrationReadModel>;
  readonly dispatch: (
    command: OrchestrationCommand,
  ) => Promise<{ readonly sequence: number } | void>;
  readonly searchComposioToolkits?: (input: {
    readonly query?: string;
    readonly limit?: number;
  }) => Promise<{
    readonly status: "available" | "setup-required" | "unavailable";
    readonly toolkits: readonly ComposioToolkit[];
  }>;
  readonly now?: () => string;
  readonly id?: () => string;
}

export interface IsnadiCatalogBackendOptions {
  readonly webSearch?: (input: {
    readonly query: string;
    readonly domains?: readonly string[];
  }) => Promise<IsnadiToolResult>;
  readonly webFetch?: (input: { readonly url: string }) => Promise<IsnadiToolResult>;
  readonly generateImage?: (
    input: (typeof IsnadiToolInputSchemas.GenerateImage)["Type"],
  ) => Promise<IsnadiToolResult>;
  readonly addMcpServer?: (
    input: (typeof IsnadiToolInputSchemas.AddMcpServer)["Type"],
  ) => Promise<IsnadiToolResult>;
  readonly uninstallMcpServer?: (serverId: string) => Promise<IsnadiToolResult>;
  readonly removeMcpAccount?: (serverId: string) => Promise<IsnadiToolResult>;
  readonly renameMcpAccount?: (
    input: (typeof IsnadiToolInputSchemas.RenameMcpAccount)["Type"],
  ) => Promise<IsnadiToolResult>;
  readonly setMcpInstructions?: (input: {
    readonly serverId: string;
    readonly instructions: string;
  }) => Promise<IsnadiToolResult>;
}
