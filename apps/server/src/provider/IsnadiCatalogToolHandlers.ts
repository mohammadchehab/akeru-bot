import * as Predicate from "effect/Predicate";
import type { McpManager } from "@mastra/code-sdk/mcp/index";
import { type IsnadiToolId, decodeIsnadiToolInput } from "@isnadi/contracts";
import { parseIsnadiPublicUrl } from "./IsnadiWebFetch.ts";
import { createIsnadiPluginRuntime } from "./tools/IsnadiPluginCatalog.ts";
import {
  type IsnadiMcpHealthHandlerOptions,
  type IsnadiCatalogBackendOptions,
  type IsnadiCatalogToolHandler,
} from "./tools/IsnadiCatalogTypes.ts";
import {
  requiredString,
  mcpHealthStatus,
  checkMcpConnection,
  field,
} from "./tools/IsnadiMcpHealth.ts";

export function createIsnadiCatalogToolHandlers(
  mcpManager?: McpManager,
  pluginRuntime?: ReturnType<typeof createIsnadiPluginRuntime>,
  health?: IsnadiMcpHealthHandlerOptions,
  backends: IsnadiCatalogBackendOptions = {},
): Partial<Record<IsnadiToolId, IsnadiCatalogToolHandler>> {
  const statuses = () => mcpManager?.getServerStatuses() ?? [];

  return {
    ...(backends.webSearch
      ? {
          WebSearch: async ({ input }) => {
            const request = decodeIsnadiToolInput("WebSearch", input);

            return backends.webSearch!({
              query: request.query,
              ...(request.domains ? { domains: request.domains } : {}),
            });
          },
        }
      : {}),
    ...(backends.webFetch
      ? {
          WebFetch: async ({ input }) => {
            const url = parseIsnadiPublicUrl(requiredString(input, "url"));

            return backends.webFetch!({ url: url.toString() });
          },
        }
      : {}),
    ...(backends.generateImage
      ? {
          GenerateImage: async ({ input }) =>
            backends.generateImage!(decodeIsnadiToolInput("GenerateImage", input)),
        }
      : {}),
    ...(backends.addMcpServer
      ? {
          AddMcpServer: async ({ input }) =>
            backends.addMcpServer!(decodeIsnadiToolInput("AddMcpServer", input)),
        }
      : {}),
    ...(backends.uninstallMcpServer
      ? {
          UninstallMcpServer: async ({ input }) =>
            backends.uninstallMcpServer!(requiredString(input, "serverId")),
        }
      : {}),
    ...(backends.removeMcpAccount
      ? {
          RemoveMcpAccount: async ({ input }) =>
            backends.removeMcpAccount!(requiredString(input, "serverId")),
        }
      : {}),
    ...(backends.renameMcpAccount
      ? {
          RenameMcpAccount: async ({ input }) =>
            backends.renameMcpAccount!(decodeIsnadiToolInput("RenameMcpAccount", input)),
        }
      : {}),
    ...(backends.setMcpInstructions
      ? {
          SetMcpInstructions: async ({ input }) =>
            backends.setMcpInstructions!(decodeIsnadiToolInput("SetMcpInstructions", input)),
        }
      : {}),
    ...(pluginRuntime
      ? {
          SearchPlugins: async ({ input }) =>
            pluginRuntime.search(decodeIsnadiToolInput("SearchPlugins", input), statuses()),
          GetPlugin: async ({ input }) =>
            pluginRuntime.getPlugin(requiredString(input, "pluginId"), statuses()),
          InstallPlugin: async ({ input, emitProgress }) => {
            const pluginId = requiredString(input, "pluginId");
            await emitProgress(`Installing plugin '${pluginId}'.`);

            return pluginRuntime.install(pluginId);
          },
          UninstallPlugin: async ({ input, emitProgress }) => {
            const pluginId = requiredString(input, "pluginId");
            await emitProgress(`Removing plugin '${pluginId}'.`);

            return pluginRuntime.uninstall(pluginId, statuses());
          },
        }
      : {}),
    ...(mcpManager
      ? {
          ...(health
            ? {
                GetMcpServerStatus: async ({ input }) =>
                  mcpHealthStatus(mcpManager, health, requiredString(input, "serverId")),
                TestMcpServer: async ({ input, emitProgress }) =>
                  checkMcpConnection(
                    mcpManager,
                    health,
                    requiredString(input, "serverId"),
                    emitProgress,
                    "Testing",
                  ),
                ReconnectMcpServer: async ({ input, emitProgress }) =>
                  checkMcpConnection(
                    mcpManager,
                    health,
                    requiredString(input, "serverId"),
                    emitProgress,
                    "Reconnecting",
                  ),
              }
            : {}),
          AuthenticateMcpServer: async ({ input, emitProgress }) => {
            const serverId = requiredString(input, "serverId");
            let authorizationUrl: string | undefined;

            const status = await mcpManager.authenticateServer(serverId, {
              onAuthorizationUrl: (url) => {
                authorizationUrl = url;
                void emitProgress(`Authorize MCP server '${serverId}'.`, {
                  authorizationUrl: url,
                });
              },
            });

            if (!status.connected) {
              throw new Error(status.error ?? `MCP server '${serverId}' was not authenticated.`);
            }

            return { ...status, authorizationUrl: authorizationUrl ?? null };
          },
          RestartMcpServers: async ({ input, emitProgress }) => {
            const requested = field(input, "serverIds");

            const serverIds = Array.isArray(requested)
              ? requested.filter((value): value is string => Predicate.isString(value))
              : [];

            if (serverIds.length === 0) {
              await emitProgress("Restarting MCP servers.");
              await mcpManager.reload();

              return { servers: mcpManager.getServerStatuses() };
            }

            const servers = [];

            for (const serverId of new Set(serverIds)) {
              await emitProgress(`Restarting MCP server '${serverId}'.`);
              const status = await mcpManager.reconnectServer(serverId);

              if (!status.connected) {
                throw new Error(status.error ?? `MCP server '${serverId}' did not reconnect.`);
              }

              servers.push(status);
            }

            return { servers };
          },
        }
      : {}),
  };
}

export {
  type IsnadiCatalogToolHandlerInput,
  type IsnadiCatalogToolHandler,
  type IsnadiMcpDependencies,
  type IsnadiMcpHealthHandlerOptions,
  type IsnadiPluginRuntimeOptions,
  type IsnadiCatalogBackendOptions,
} from "./tools/IsnadiCatalogTypes.ts";

export { createIsnadiPluginRuntime } from "./tools/IsnadiPluginCatalog.ts";
