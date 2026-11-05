import { BOT_ENGINE_MAX_FALLBACKS, type BotEngineChoice } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  addBotEngineFallback,
  moveBotEngineFallback,
  removeBotEngineFallback,
} from "./botEngineFallbacks";

const choice = (provider: string, model: string): BotEngineChoice => ({ provider, model });
const primary = choice("codex", "gpt-5");

describe("addBotEngineFallback", () => {
  it("appends a new entry to the end of the chain", () => {
    const first = choice("claude", "sonnet");
    const second = choice("grok", "grok-4");

    expect(addBotEngineFallback({ primary, fallbacks: [first], entry: second })).toEqual([
      first,
      second,
    ]);
  });

  it("ignores the primary and entries already in the chain", () => {
    const first = choice("claude", "sonnet");

    expect(addBotEngineFallback({ primary, fallbacks: [first], entry: primary })).toEqual([first]);
    expect(addBotEngineFallback({ primary, fallbacks: [first], entry: first })).toEqual([first]);
  });

  it("stops at the maximum chain length", () => {
    const full = Array.from({ length: BOT_ENGINE_MAX_FALLBACKS }, (_, index) =>
      choice("claude", `model-${index}`),
    );

    expect(addBotEngineFallback({ primary, fallbacks: full, entry: choice("grok", "x") })).toEqual(
      full,
    );
  });
});

describe("removeBotEngineFallback", () => {
  it("drops the entry at the index", () => {
    const first = choice("claude", "sonnet");
    const second = choice("grok", "grok-4");

    expect(removeBotEngineFallback([first, second], 0)).toEqual([second]);
  });
});

describe("moveBotEngineFallback", () => {
  it("swaps an entry with its neighbour", () => {
    const first = choice("claude", "sonnet");
    const second = choice("grok", "grok-4");

    expect(moveBotEngineFallback([first, second], 1, -1)).toEqual([second, first]);
  });

  it("leaves the chain alone at either end", () => {
    const first = choice("claude", "sonnet");
    const second = choice("grok", "grok-4");

    expect(moveBotEngineFallback([first, second], 0, -1)).toEqual([first, second]);
    expect(moveBotEngineFallback([first, second], 1, 1)).toEqual([first, second]);
  });
});
