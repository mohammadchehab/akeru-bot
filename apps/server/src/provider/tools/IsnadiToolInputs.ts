import { IsnadiToolInputSchemas, decodeIsnadiToolInput } from "@isnadi/contracts";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { IsnadiMemoryToolInputSchema } from "../../memory/BotMemoryToolHandlers.ts";
import type { IsnadiRuntimeToolId } from "./IsnadiToolTypes.ts";

const decodeMemoryInput = Schema.decodeUnknownSync(IsnadiMemoryToolInputSchema);

export function normalizeIsnadiToolInput<Input>(
  toolId: Exclude<IsnadiRuntimeToolId, "memory">,
  input: Input,
  omitUnknownNulls = false,
) {
  if (!Predicate.isObject(input) || Array.isArray(input)) return input;

  const schema = IsnadiToolInputSchemas[toolId];
  const fields: Readonly<Record<string, Schema.Top>> = "fields" in schema ? schema.fields : {};

  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => {
      const field = fields[key];

      return (
        value !== null ||
        (field ? !Schema.is(field)(undefined) || Schema.is(field)(null) : !omitUnknownNulls)
      );
    }),
  );
}

export function decodeIsnadiRuntimeToolInput<Input>(
  toolId: IsnadiRuntimeToolId,
  input: Input,
  options?: { readonly approvalGrant: boolean },
) {
  if (toolId === "memory")
    return { toolId, input: decodeMemoryInput(input, { onExcessProperty: "error" }) };
  const normalized = normalizeIsnadiToolInput(toolId, input, options?.approvalGrant);

  switch (toolId) {
    case "Shell":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "Read":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "Screenshot":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "CopyToBox":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "CopyFromBox":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "request_box_help":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "ExternalShell":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "ExternalRead":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "AwaitShell":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "AwaitExternalShell":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "CreateAgent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "CheckAgent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "MessageAgent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "StopAgent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "SendToAgent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "CreateChannel":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "UpdateChannel":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "SendToUser":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "SearchPlugins":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "GetPlugin":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "ReactToMessage":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "InstallPlugin":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "UninstallPlugin":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "GetMcpServerStatus":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "TestMcpServer":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "ReconnectMcpServer":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "UpdateBotProfile":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "AuthenticateMcpServer":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "RestartMcpServers":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "WebSearch":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "WebFetch":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "GenerateImage":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "AddMcpServer":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "UninstallMcpServer":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "RemoveMcpAccount":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "RenameMcpAccount":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "SetMcpInstructions":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "Task":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "CheckSubagent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "MessageSubagent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
    case "StopSubagent":
      return { toolId, input: decodeIsnadiToolInput(toolId, normalized) };
  }
}
