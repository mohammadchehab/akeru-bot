import * as Predicate from "effect/Predicate";
import { RequestContext } from "@mastra/core/request-context";
import * as DateTime from "effect/DateTime";
import {
  createIsnadiAgentInstructions,
  createIsnadiBotInstructions,
} from "../IsnadiAgentInstructions.ts";
import { controllerContext } from "./IsnadiMemory.ts";

export function resolveIsnadiInstructions(
  requestContext: RequestContext,
  now = DateTime.nowUnsafe(),
): string {
  const state = controllerContext(requestContext)?.state;

  const isBotConversation =
    Predicate.isObjectOrArray(state) &&
    state !== null &&
    "botConversation" in state &&
    state.botConversation === true;

  const name =
    isBotConversation && "botName" in state && Predicate.isString(state.botName)
      ? state.botName
      : "Isnadi";

  const personalityTone =
    isBotConversation && "personalityTone" in state && Predicate.isNumber(state.personalityTone)
      ? state.personalityTone
      : undefined;

  const instructions = isBotConversation
    ? createIsnadiBotInstructions({
        name,
        now,
        ...(personalityTone !== undefined ? { personalityTone } : {}),
      })
    : createIsnadiAgentInstructions({
        name,
        now,
        ...(personalityTone !== undefined ? { personalityTone } : {}),
      });

  const persistentMemoryContext =
    Predicate.isObjectOrArray(state) &&
    state !== null &&
    "persistentMemoryContext" in state &&
    Predicate.isString(state.persistentMemoryContext)
      ? state.persistentMemoryContext
      : "";

  const mcpInstructions =
    Predicate.isObjectOrArray(state) &&
    state !== null &&
    "mcpInstructions" in state &&
    Predicate.isString(state.mcpInstructions)
      ? state.mcpInstructions
      : "";

  return [instructions, mcpInstructions, persistentMemoryContext].filter(Boolean).join("\n\n");
}
