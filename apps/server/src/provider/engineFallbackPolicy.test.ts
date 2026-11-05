import { describe, expect, it } from "@effect/vitest";
import { ProviderDriverKind, ProviderInstanceId, type ServerProvider } from "@isnadi/contracts";

import { validateEngineFallbacks } from "./engineFallbackPolicy.ts";

const providerOf = (instanceId: string, driver: string): ServerProvider => ({
  instanceId: ProviderInstanceId.make(instanceId),
  driver: ProviderDriverKind.make(driver),
  enabled: true,
  installed: true,
  version: null,
  status: "ready",
  auth: { status: "authenticated" },
  checkedAt: "2026-09-30T00:00:00.000Z",
  models: [],
  slashCommands: [],
  skills: [],
});

const providers = [
  providerOf("codex", "codex"),
  providerOf("claude", "claudeAgent"),
  providerOf("opencode", "opencode"),
  providerOf("opencodeGo", "opencodeGo"),
  providerOf("custom", "customOpenai"),
  providerOf("custom-2", "customOpenai"),
];

const validate = (
  primary: string,
  fallbacks: ReadonlyArray<{ provider: string; model: string; historyConsent?: boolean }>,
) =>
  validateEngineFallbacks({
    providers,
    engine: { provider: primary, fallbacks },
  });

describe("validateEngineFallbacks", () => {
  it("accepts an empty chain", () => {
    expect(validate("codex", [])).toBeUndefined();
  });

  it("accepts supported providers", () => {
    expect(
      validate("codex", [
        { provider: "claude", model: "a" },
        { provider: "opencodeGo", model: "b" },
      ]),
    ).toBeUndefined();
  });

  it("rejects standard OpenCode as a fallback", () => {
    expect(validate("codex", [{ provider: "opencode", model: "a" }])).toMatch(/OpenCode/);
  });

  it("rejects a Custom API fallback without history consent on another provider", () => {
    expect(validate("codex", [{ provider: "custom", model: "a" }])).toMatch(/consent/i);
  });

  it("accepts a Custom API fallback with history consent", () => {
    expect(
      validate("codex", [{ provider: "custom", model: "a", historyConsent: true }]),
    ).toBeUndefined();
  });

  it("requires consent for an instance the registry does not report", () => {
    expect(validate("codex", [{ provider: "ghost", model: "a" }])).toMatch(/consent/i);
    expect(
      validate("codex", [{ provider: "ghost", model: "a", historyConsent: true }]),
    ).toBeUndefined();
  });

  it("requires consent for a different Custom API instance under a Custom API primary", () => {
    expect(validate("custom", [{ provider: "custom-2", model: "a" }])).toMatch(/consent/i);
    expect(
      validate("custom", [{ provider: "custom-2", model: "a", historyConsent: true }]),
    ).toBeUndefined();
  });

  it("accepts an entry on the primary's own instance without consent", () => {
    expect(validate("custom", [{ provider: "custom", model: "a" }])).toBeUndefined();
  });
});
