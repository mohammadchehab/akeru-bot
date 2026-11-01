import * as Predicate from "effect/Predicate";
import type { ToolsInput } from "@mastra/core/agent";
import { type Tool, createTool } from "@mastra/core/tools";
import { IsnadiToolInputSchemas } from "@isnadi/contracts";
import * as Schema from "effect/Schema";
import { z } from "zod";

import {
  isMemoryToolId,
  type IsnadiRuntimeToolId,
  type IsnadiToolRuntime,
} from "./IsnadiToolRuntime.ts";
import { IsnadiMemoryToolInputSchema } from "../memory/BotMemoryToolHandlers.ts";

function inputSchema(toolId: IsnadiRuntimeToolId) {
  return isMemoryToolId(toolId) ? IsnadiMemoryToolInputSchema : IsnadiToolInputSchemas[toolId];
}

function omitNullValues<Input>(input: Input) {
  if (!input || !Predicate.isObjectOrArray(input) || Array.isArray(input)) return input;

  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null));
}

export function createIsnadiMastraTools(threadId: string, runtime: IsnadiToolRuntime): ToolsInput {
  return Object.fromEntries(
    runtime.toolsForThread(threadId).map((definition) => {
      const schema = inputSchema(definition.id);
      const standardSchema = Schema.toStandardJSONSchemaV1(schema);

      const approval: NonNullable<Tool["needsApprovalFn"]> = (input) =>
        runtime.requiresApproval(threadId, definition.id, omitNullValues(input));

      const tool = createTool({
        id: definition.id,
        description: definition.description,
        inputSchema: z.fromJSONSchema(
          standardSchema["~standard"].jsonSchema.input({ target: "draft-07" }),
          { defaultTarget: "draft-7" },
        ),
        requireApproval: approval,
        execute: (input, context) => {
          const toolCallId = context.agent?.toolCallId;

          if (!toolCallId) {
            throw new Error(`Tool '${definition.id}' has no call identity.`);
          }

          return runtime.execute({
            threadId,
            toolId: definition.id,
            toolCallId,
            input: omitNullValues(input),
            approvalMode: "require-grant",
          });
        },
      });

      tool.needsApprovalFn = approval;

      return [definition.id, tool] as const;
    }),
  );
}
