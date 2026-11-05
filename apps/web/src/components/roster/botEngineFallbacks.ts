import { BOT_ENGINE_MAX_FALLBACKS, type BotEngine, type BotEngineChoice } from "@isnadi/contracts";

type Fallbacks = BotEngine["fallbacks"];

const sameChoice = (left: BotEngineChoice, right: BotEngineChoice) =>
  left.provider === right.provider && left.model === right.model;

/** Appends a fallback, skipping the primary, repeats, and anything past the chain limit. */
export function addBotEngineFallback(input: {
  readonly primary: BotEngineChoice;
  readonly fallbacks: Fallbacks;
  readonly entry: BotEngineChoice;
}): Fallbacks {
  const { primary, fallbacks, entry } = input;

  if (fallbacks.length >= BOT_ENGINE_MAX_FALLBACKS) return fallbacks;

  if (sameChoice(primary, entry) || fallbacks.some((existing) => sameChoice(existing, entry))) {
    return fallbacks;
  }

  return [...fallbacks, entry];
}

export function removeBotEngineFallback(fallbacks: Fallbacks, index: number): Fallbacks {
  return fallbacks.filter((_, position) => position !== index);
}

/** Moves an entry one step earlier (-1) or later (1); the ends stay put. */
export function moveBotEngineFallback(
  fallbacks: Fallbacks,
  index: number,
  direction: -1 | 1,
): Fallbacks {
  const target = index + direction;

  if (target < 0 || target >= fallbacks.length) return fallbacks;

  const next = [...fallbacks];
  const moved = next[index];
  const swapped = next[target];

  if (!moved || !swapped) return fallbacks;

  next[index] = swapped;
  next[target] = moved;

  return next;
}

/** The engine a draft saves: its model, reasoning choices, and the whole fallback chain. */
export function botEngineFromDraft(input: {
  readonly provider: string;
  readonly model: string;
  readonly options?: BotEngineChoice["options"];
  readonly fallbacks: Fallbacks;
}): BotEngine {
  return {
    provider: input.provider,
    model: input.model,
    ...(input.options ? { options: input.options } : {}),
    fallbacks: input.fallbacks,
  };
}
