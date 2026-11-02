import type { McpServerStatus } from "@mastra/code-sdk/mcp/index";
import { BotId } from "@isnadi/contracts";
import { vi } from "vite-plus/test";

export function makeIsnadiCatalogToolHandlersTestSupport() {
  const connectedStatus: McpServerStatus = {
    name: "search",
    connected: true,
    toolCount: 1,
    toolNames: ["search_web"],
    transport: "http",
  };

  function healthOptions(overrides = {}) {
    return {
      getRequestHealth: () => undefined,
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getDependencies: async () => ({
        dependentBots: [{ id: BotId.make("bot-isnadi"), name: "Isnadi" }],
        dependentRoutines: [],
      }),
      now: () => "2026-09-01T02:00:00.000Z",
      ...overrides,
    };
  }

  const now = "2026-01-01T00:00:00.000Z";

  function snapshot<Server extends object, Bot extends object>(
    mcpServers: readonly Server[] = [],
    bots: readonly Bot[] = [],
  ) {
    return {
      snapshotSequence: 0,
      projects: [],
      bots,
      groups: [],
      delegations: [],
      mcpServers,
      threads: [],
      updatedAt: now,
    } as never;
  }

  return { connectedStatus, healthOptions, now, snapshot };
}
