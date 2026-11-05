import type { BotEngine, ServerProvider } from "@isnadi/contracts";

const OPENCODE_DRIVER = "opencode";

const CUSTOM_API_DRIVER = "customOpenai";

/**
 * Checks a bot engine's fallback chain on save. Returns the reason the chain
 * is refused, or undefined when it may be stored. Standard OpenCode runs on the
 * legacy bridge, which cannot retry a turn on another model, so it cannot be a
 * fallback. A Custom API endpoint is an arbitrary host, so it only receives a
 * chat from another instance after the user consented to sharing the history,
 * and so does an instance the registry does not report, since its host is
 * unknown.
 */
export const validateEngineFallbacks = (input: {
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly engine: Pick<BotEngine, "provider" | "fallbacks">;
}): string | undefined => {
  const driverOf = (instanceId: string) =>
    input.providers.find((provider) => provider.instanceId === instanceId)?.driver;

  for (const entry of input.engine.fallbacks) {
    const driver = driverOf(entry.provider);

    if (driver === OPENCODE_DRIVER) {
      return "OpenCode cannot be a fallback model. Pick another provider.";
    }

    if (
      entry.provider !== input.engine.provider &&
      (driver === CUSTOM_API_DRIVER || driver === undefined) &&
      entry.historyConsent !== true
    ) {
      return "A Custom API fallback needs consent to share this bot's chat history with it.";
    }
  }

  return undefined;
};
