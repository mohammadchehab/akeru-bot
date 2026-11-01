import type { decodeIsnadiToolInput } from "./isnadiTools/inputs.ts";
import * as Predicate from "effect/Predicate";
import {
  ISNADI_DELEGATION_MAX_CONCURRENCY,
  ISNADI_DELEGATION_MAX_DEPTH,
} from "./isnadiDelegation.ts";
import { ISNADI_WORKER_MAX_DEPTH } from "./isnadiWorkers.ts";
import {
  IsnadiToolId,
  IsnadiToolApprovalClass,
  IsnadiProtectedApprovalClass,
  ISNADI_PROTECTED_APPROVAL_CLASSES,
  IsnadiToolCapability,
  IsnadiToolWorkspaceType,
  type IsnadiCopyDirection,
  type IsnadiToolDefinition,
  ISNADI_TOOL_CATALOG,
} from "./isnadiTools/catalog.ts";

export interface IsnadiToolAvailabilityContext {
  readonly capabilities: ReadonlySet<IsnadiToolCapability>;
  readonly workspaceType: IsnadiToolWorkspaceType;
  readonly hasUserComputer: boolean;
  readonly localFullAccess: boolean;
  readonly implementedTools: ReadonlySet<string>;
  readonly delegationDepth?: number;
  readonly activeDelegations?: number;
  /** 0 for a bot turn, 1 inside a temporary worker. */
  readonly workerDepth?: number;
}

export function filterIsnadiTools(
  context: IsnadiToolAvailabilityContext,
): ReadonlyArray<IsnadiToolDefinition> {
  return ISNADI_TOOL_CATALOG.filter((tool) => {
    if (!context.capabilities.has(tool.capability)) return false;

    if (!context.implementedTools.has(tool.id)) return false;

    if (
      (tool.id === "SendToAgent" || tool.id === "MessageAgent") &&
      ((context.delegationDepth ?? 0) >= ISNADI_DELEGATION_MAX_DEPTH ||
        (context.activeDelegations ?? 0) >= ISNADI_DELEGATION_MAX_CONCURRENCY)
    )
      return false;

    if (tool.id === "Task" && (context.workerDepth ?? 0) >= ISNADI_WORKER_MAX_DEPTH) return false;

    if (tool.workspace === "bot-workspace" && context.workspaceType === "none") return false;

    if (tool.workspace === "user-computer" && !context.hasUserComputer) return false;

    return !(tool.requiresUserComputer && !context.hasUserComputer);
  });
}

export function classifyIsnadiSensitivePath(
  path: string,
): IsnadiProtectedApprovalClass | undefined {
  return /(^|[/\\])(?:\.env(?:\.[^/\\]+)?|\.ssh|\.aws|\.config[/\\]gh|keychain|credentials?|secrets?|tokens?)(?:[/\\]|$)/i.test(
    path,
  )
    ? "secrets"
    : undefined;
}

export function classifyIsnadiExternalCommand(
  command: string,
): IsnadiProtectedApprovalClass | undefined {
  if (/\b(stripe|checkout|payment|purchase|buy)\b/i.test(command)) return "pay";

  if (/\b(rm|rmdir|unlink|trash|delete|drop|destroy|wipe)\b/i.test(command)) return "delete";

  if (/\b(secret|credential|token|password|keychain|\.env)\b/i.test(command)) return "secrets";

  if (
    /\b(deploy|release|publish|production|kubectl|terraform\s+apply|git\s+push|gh\s+pr\s+(?:create|merge))\b/i.test(
      command,
    )
  )
    return "production";

  if (
    /\b(send|post|comment|message|mail|curl\b[^\n]*(?:-X\s*POST|--request\s+POST|-d\b|--data(?:-raw|-binary|-urlencode)?\b))\b/i.test(
      command,
    )
  )
    return "send";

  return undefined;
}

export function isnadiToolApprovalForInput(
  tool: IsnadiToolDefinition,
  input: Parameters<typeof decodeIsnadiToolInput>[1],
  context?: { readonly workspaceType?: IsnadiToolWorkspaceType },
): IsnadiToolApprovalClass {
  if (!Predicate.isObjectOrArray(input)) return tool.approval;

  if (
    (tool.id === "Shell" || tool.id === "ExternalShell") &&
    "command" in input &&
    Predicate.isString(input.command)
  ) {
    const protectedClass = classifyIsnadiExternalCommand(input.command);

    if (protectedClass) return protectedClass;
  }

  if (tool.id === "ExternalRead" && "path" in input && Predicate.isString(input.path)) {
    return classifyIsnadiSensitivePath(input.path) ?? tool.approval;
  }

  if (tool.id === "CopyToBox" && "sourcePath" in input && Predicate.isString(input.sourcePath)) {
    return classifyIsnadiSensitivePath(input.sourcePath) ?? tool.approval;
  }

  if (tool.id === "CopyFromBox" && "sourcePath" in input && Predicate.isString(input.sourcePath)) {
    return classifyIsnadiSensitivePath(input.sourcePath) ?? tool.approval;
  }

  if (tool.id === "Shell" && context?.workspaceType === "local") return "user-computer";

  return tool.approval;
}

export function isnadiToolRequiresApproval(
  tool: IsnadiToolDefinition,
  context: Pick<IsnadiToolAvailabilityContext, "localFullAccess"> & {
    readonly workspaceType?: IsnadiToolWorkspaceType;
  },
  input?: Parameters<typeof decodeIsnadiToolInput>[1],
): boolean {
  const approval = isnadiToolApprovalForInput(tool, input, context);

  if (tool.id === "Shell" && context.workspaceType === "local") return true;

  if (
    Array.from(ISNADI_PROTECTED_APPROVAL_CLASSES).some(
      (protectedClass) => protectedClass === approval,
    )
  )
    return true;

  return approval === "user-computer" && !(context.localFullAccess && input !== undefined);
}

export function copyDirectionForTool(toolId: IsnadiToolId): IsnadiCopyDirection | undefined {
  return ISNADI_TOOL_CATALOG.find((tool) => tool.id === toolId)?.copy;
}

export {
  ISNADI_COMMAND_MAX_CHARS,
  ISNADI_PATH_MAX_CHARS,
  IsnadiAwaitHandleId,
  IsnadiPluginRecommendation,
  IsnadiPluginSearchResult,
  IsnadiComputerBoundary,
  ISNADI_DELEGATION_CONTEXT_MAX_CHARS,
  IsnadiToolInputSchemas,
  IsnadiMessageReactionResult,
  decodeIsnadiToolInput,
} from "./isnadiTools/inputs.ts";

export {
  IsnadiToolId,
  IsnadiToolApprovalClass,
  IsnadiProtectedApprovalClass,
  ISNADI_PROTECTED_APPROVAL_CLASSES,
  IsnadiToolCapability,
  IsnadiToolWorkspaceType,
  type IsnadiToolWorkspaceRequirement,
  type IsnadiCopyDirection,
  type IsnadiToolDefinition,
  ISNADI_TOOL_CATALOG,
} from "./isnadiTools/catalog.ts";

export {
  IsnadiToolReceiptPhase,
  IsnadiToolFailureCode,
  IsnadiToolReceipt,
} from "./isnadiTools/receipts.ts";
