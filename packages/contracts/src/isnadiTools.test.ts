import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  ISNADI_DELEGATION_CONTEXT_MAX_CHARS,
  ISNADI_TOOL_CATALOG,
  IsnadiToolReceipt,
  isnadiToolApprovalForInput,
  isnadiToolRequiresApproval,
  copyDirectionForTool,
  decodeIsnadiToolInput,
  filterIsnadiTools,
} from "./isnadiTools.ts";

describe("Isnadi tool contracts", () => {
  it("includes the M2-T6 catalog ids and rejects invalid inputs", () => {
    for (const id of [
      "WebSearch",
      "WebFetch",
      "GenerateImage",
      "AddMcpServer",
      "UninstallMcpServer",
      "RemoveMcpAccount",
      "RenameMcpAccount",
      "SetMcpInstructions",
    ] as const) {
      expect(ISNADI_TOOL_CATALOG.some((tool) => tool.id === id)).toBe(true);
    }

    expect(() => decodeIsnadiToolInput("WebSearch", { query: "" })).toThrow();
    expect(() => decodeIsnadiToolInput("WebFetch", { url: "file:///secret" })).toThrow();
    expect(() =>
      decodeIsnadiToolInput("GenerateImage", { operation: "generate", prompt: "" }),
    ).toThrow();
    expect(() =>
      decodeIsnadiToolInput("AddMcpServer", { serverId: "x", name: "x", transport: "stdio" }),
    ).toThrow();
    expect(() =>
      decodeIsnadiToolInput("AddMcpServer", { serverId: "x", name: "x", transport: "url" }),
    ).toThrow();
    expect(() => decodeIsnadiToolInput("RenameMcpAccount", { serverId: "x" })).toThrow();
    expect(() =>
      decodeIsnadiToolInput("AddMcpServer", {
        serverId: "x",
        name: "x",
        transport: "url",
        url: "https://user:pass@example.com",
      }),
    ).toThrow();
  });
  it("validates copy direction and rejects incomplete input", () => {
    expect(copyDirectionForTool("CopyToBox")).toEqual({
      from: "user-computer",
      to: "bot-workspace",
    });
    expect(copyDirectionForTool("CopyFromBox")).toEqual({
      from: "bot-workspace",
      to: "user-computer",
    });
    expect(() => decodeIsnadiToolInput("CopyToBox", { path: "/tmp/report" })).toThrow();
  });

  it("only returns implemented tools for available computer boundaries", () => {
    expect(
      filterIsnadiTools({
        capabilities: new Set(["bot-workspace", "user-computer"]),
        workspaceType: "local",
        hasUserComputer: false,
        localFullAccess: false,
        implementedTools: new Set(["Shell", "ExternalShell", "CopyToBox"]),
      }).map((tool) => tool.id),
    ).toEqual(["Shell"]);
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "AuthenticateMcpServer")?.approval).toBe(
      "secrets",
    );
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "RestartMcpServers")?.approval).toBe(
      "production",
    );
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "InstallPlugin")?.approval).toBe(
      "production",
    );
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "UninstallPlugin")?.approval).toBe(
      "delete",
    );
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "SearchPlugins")?.approval).toBe("none");
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "GetPlugin")?.approval).toBe("none");
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "GetMcpServerStatus")?.approval).toBe(
      "none",
    );
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "TestMcpServer")?.approval).toBe(
      "production",
    );
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "ReconnectMcpServer")?.approval).toBe(
      "production",
    );
  });

  it("accepts catalog-owned plugin inputs and rejects model-supplied recipes", () => {
    expect(decodeIsnadiToolInput("InstallPlugin", { pluginId: "exa" })).toEqual({
      pluginId: "exa",
    });
    expect(() =>
      decodeIsnadiToolInput("InstallPlugin", {
        pluginId: "exa",
        url: "https://attacker.example/mcp",
      }),
    ).toThrow();
    expect(() => decodeIsnadiToolInput("SearchPlugins", { query: "web", limit: 51 })).toThrow();
  });

  it("hides SendToAgent at delegation limits", () => {
    const context = {
      capabilities: new Set(["bot-workspace"] as const),
      workspaceType: "local" as const,
      hasUserComputer: false,
      localFullAccess: false,
      implementedTools: new Set(["SendToAgent"]),
    };

    expect(
      filterIsnadiTools({ ...context, delegationDepth: 1, activeDelegations: 2 }).map(
        (tool) => tool.id,
      ),
    ).toEqual(["SendToAgent"]);
    expect(filterIsnadiTools({ ...context, delegationDepth: 2, activeDelegations: 2 })).toEqual([]);
    expect(filterIsnadiTools({ ...context, delegationDepth: 1, activeDelegations: 3 })).toEqual([]);
  });

  it("hides Task inside a worker and validates worker inputs", () => {
    const context = {
      capabilities: new Set(["bot-workspace"] as const),
      workspaceType: "local" as const,
      hasUserComputer: false,
      localFullAccess: false,
      implementedTools: new Set(["Task", "CheckSubagent", "MessageSubagent", "StopSubagent"]),
    };

    expect(filterIsnadiTools({ ...context, workerDepth: 0 }).map((tool) => tool.id)).toEqual([
      "Task",
      "CheckSubagent",
      "MessageSubagent",
      "StopSubagent",
    ]);
    expect(filterIsnadiTools({ ...context, workerDepth: 1 }).map((tool) => tool.id)).toEqual([
      "CheckSubagent",
      "MessageSubagent",
      "StopSubagent",
    ]);

    for (const toolId of ["Task", "CheckSubagent", "MessageSubagent", "StopSubagent"] as const) {
      expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === toolId)?.approval).toBe("none");
    }

    expect(decodeIsnadiToolInput("Task", { task: "Summarize", background: true })).toEqual({
      task: "Summarize",
      background: true,
    });
    expect(() => decodeIsnadiToolInput("Task", { task: "  " })).toThrow();
    expect(() => decodeIsnadiToolInput("CheckSubagent", {})).toThrow();
    expect(() => decodeIsnadiToolInput("MessageSubagent", { workerId: "worker-1" })).toThrow();
  });

  it("decodes the approval limit and keeps escalation fields server-owned", () => {
    const input = {
      botId: "bot-research",
      task: "Compare three flights.",
      expectedResult: "A short comparison with sources.",
      approvalCeiling: "send" as const,
    };

    expect(decodeIsnadiToolInput("SendToAgent", input)).toMatchObject(input);
    expect(() => decodeIsnadiToolInput("SendToAgent", { ...input, depth: 2 })).toThrow();
    expect(() =>
      decodeIsnadiToolInput("SendToAgent", {
        ...input,
        hasUserComputer: true,
      }),
    ).toThrow();
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "SendToAgent")?.approval).toBe("send");
  });

  it("bounds the context a bot hands to a child and rejects oversized context", () => {
    const input = {
      botId: "bot-research",
      task: "Compare three flights.",
      expectedResult: "A short comparison with sources.",
    };

    const context = "x".repeat(ISNADI_DELEGATION_CONTEXT_MAX_CHARS);
    expect(decodeIsnadiToolInput("SendToAgent", { ...input, context })).toMatchObject({ context });
    expect(
      decodeIsnadiToolInput("MessageAgent", { ...input, context: "Prefers morning flights." }),
    ).toMatchObject({ context: "Prefers morning flights." });
    expect(() =>
      decodeIsnadiToolInput("SendToAgent", { ...input, context: `${context}x` }),
    ).toThrow(`at most ${ISNADI_DELEGATION_CONTEXT_MAX_CHARS} characters`);
  });

  it("types durable bot management without bypassing send or cancellation approval", () => {
    expect(decodeIsnadiToolInput("CreateAgent", { name: "Research" })).toEqual({
      name: "Research",
    });
    expect(decodeIsnadiToolInput("CheckAgent", { botId: "bot-research" })).toEqual({
      botId: "bot-research",
    });
    expect(decodeIsnadiToolInput("StopAgent", { botId: "bot-research" })).toEqual({
      botId: "bot-research",
    });
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "MessageAgent")?.approval).toBe("send");
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "StopAgent")?.approval).toBe("delete");
  });

  it("decodes SendToUser input and keeps it approval-gated", () => {
    expect(decodeIsnadiToolInput("SendToUser", { message: "The export is ready." })).toEqual({
      message: "The export is ready.",
    });
    expect(() => decodeIsnadiToolInput("SendToUser", { message: "" })).toThrow();
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "SendToUser")?.approval).toBe("send");
  });

  it("decodes only narrow bot profile fields", () => {
    expect(
      decodeIsnadiToolInput("UpdateBotProfile", {
        name: "Researcher",
        label: null,
        description: "Checks primary sources.",
      }),
    ).toEqual({
      name: "Researcher",
      label: null,
      description: "Checks primary sources.",
    });
    expect(() => decodeIsnadiToolInput("UpdateBotProfile", {})).toThrow();
    expect(() =>
      decodeIsnadiToolInput("UpdateBotProfile", {
        name: "Researcher",
        botId: "another-bot",
      }),
    ).toThrow();
    expect(() =>
      decodeIsnadiToolInput("UpdateBotProfile", {
        name: "Researcher",
        groupId: "another-group",
      }),
    ).toThrow();
  });

  it("validates message reactions and keeps them approval-gated", () => {
    const input = { messageId: "message-1", emoji: "👍", action: "add" as const };
    expect(decodeIsnadiToolInput("ReactToMessage", input)).toEqual(input);
    expect(() => decodeIsnadiToolInput("ReactToMessage", { ...input, action: "toggle" })).toThrow();
    expect(ISNADI_TOOL_CATALOG.find((tool) => tool.id === "ReactToMessage")?.approval).toBe("send");
  });

  it("never lets full access bypass protected commands or paths", () => {
    const shell = ISNADI_TOOL_CATALOG.find((tool) => tool.id === "ExternalShell")!;
    const read = ISNADI_TOOL_CATALOG.find((tool) => tool.id === "ExternalRead")!;
    const copyFromBox = ISNADI_TOOL_CATALOG.find((tool) => tool.id === "CopyFromBox")!;

    const copyInput = {
      sourcePath: "/project/.env",
      destinationPath: "/tmp/exported-env",
    };

    expect(isnadiToolApprovalForInput(shell, { command: "git push origin main" })).toBe(
      "production",
    );
    expect(
      isnadiToolRequiresApproval(
        shell,
        { localFullAccess: true },
        { command: "git push origin main" },
      ),
    ).toBe(true);
    expect(
      isnadiToolRequiresApproval(read, { localFullAccess: true }, { path: "/project/.env" }),
    ).toBe(true);
    expect(isnadiToolApprovalForInput(copyFromBox, copyInput)).toBe("secrets");
    expect(isnadiToolRequiresApproval(copyFromBox, { localFullAccess: true }, copyInput)).toBe(
      true,
    );
  });

  it("decodes non-fatal typed receipts", () => {
    const decode = Schema.decodeUnknownSync(IsnadiToolReceipt);
    expect(
      decode({
        receiptId: "receipt-1",
        toolId: "Shell",
        phase: "failure",
        threadId: "thread-1",
        createdAt: "2026-08-31T00:00:00.000Z",
      }),
    ).toMatchObject({ fatalToThread: false });
    expect(() =>
      decode({
        receiptId: "receipt-2",
        toolId: "Shell",
        phase: "failure",
        threadId: "thread-1",
        fatalToThread: true,
        createdAt: "2026-08-31T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
