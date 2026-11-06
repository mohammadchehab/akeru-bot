import type { BotEngine, BotEngineChoice, ServerProvider } from "@isnadi/contracts";

const OPENCODE_DRIVER = "opencode";

const CUSTOM_API_DRIVER = "customOpenai";

type FallbackDenial = "opencode" | "needs-consent";

/**
 * The one rule behind both the save-time check and the turn-time check. Standard
 * OpenCode runs on the legacy bridge, which cannot retry a turn on another
 * model, so it cannot be a fallback. A Custom API endpoint is an arbitrary
 * host, so it only receives a chat from another instance after the user
 * consented to sharing the history, and so does an instance the registry does
 * not report, since its host is unknown.
 */
const fallbackDenial = (input: {
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly from: string;
  readonly entry: Pick<BotEngineChoice, "provider" | "historyConsent">;
}): FallbackDenial | undefined => {
  const driver = input.providers.find(
    (provider) => provider.instanceId === input.entry.provider,
  )?.driver;

  if (driver === OPENCODE_DRIVER) return "opencode";

  if (
    input.entry.provider !== input.from &&
    (driver === CUSTOM_API_DRIVER || driver === undefined) &&
    input.entry.historyConsent !== true
  ) {
    return "needs-consent";
  }

  return undefined;
};

/**
 * Whether the router may run a turn on a fallback entry. Checked on every turn
 * and never trusts that the stored list passed {@link validateEngineFallbacks}:
 * an import stores entries with their consent cleared.
 */
export const fallbackAllowedAtTurn = (input: {
  readonly providers: ReadonlyArray<ServerProvider>;
  /** The instance the chain starts on, normally the bot's primary. */
  readonly from: string;
  readonly entry: Pick<BotEngineChoice, "provider" | "historyConsent">;
}): boolean => fallbackDenial(input) === undefined;

/** Checks a bot engine's fallback chain on save. Returns the reason it is refused, or undefined when it may be stored. */
export const validateEngineFallbacks = (input: {
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly engine: Pick<BotEngine, "provider" | "fallbacks">;
}): string | undefined => {
  for (const entry of input.engine.fallbacks) {
    const denial = fallbackDenial({
      providers: input.providers,
      from: input.engine.provider,
      entry,
    });

    if (denial === "opencode") {
      return "OpenCode cannot be a fallback model. Pick another provider.";
    }

    if (denial === "needs-consent") {
      return "A Custom API fallback needs consent to share this bot's chat history with it.";
    }
  }

  return undefined;
};
