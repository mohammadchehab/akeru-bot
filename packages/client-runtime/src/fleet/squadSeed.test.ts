import {
  FLEET_ROLES,
  FLEET_TEMPLATES,
  ProviderDriverKind,
  ProviderInstanceId,
  fleetRole,
  type FleetRole,
  type ProviderOptionDescriptor,
  type ServerProvider,
} from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { seedSquad, seedSquadMember } from "./squadSeed.ts";

const effortDescriptor = (
  id: "effort" | "reasoningEffort",
  levels: ReadonlyArray<string>,
  defaultLevel: string,
): ProviderOptionDescriptor => ({
  id,
  label: "Reasoning",
  type: "select",
  options: levels.map((level) => ({
    id: level,
    label: level,
    ...(level === defaultLevel ? { isDefault: true } : {}),
  })),
});

const provider = (
  driver: string,
  model: string,
  overrides: Partial<ServerProvider> & { descriptor?: ProviderOptionDescriptor } = {},
): ServerProvider => {
  const { descriptor, ...rest } = overrides;

  return {
    instanceId: ProviderInstanceId.make(driver),
    driver: ProviderDriverKind.make(driver),
    enabled: true,
    installed: true,
    version: "1.0.0",
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-01-01T00:00:00.000Z",
    models: [
      {
        slug: model,
        name: model,
        isCustom: false,
        capabilities: descriptor ? { optionDescriptors: [descriptor] } : null,
      },
    ],
    slashCommands: [],
    skills: [],
    ...rest,
  };
};

const role = (id: string): FleetRole => {
  const found = fleetRole(id);

  if (!found) throw new Error(`missing role ${id}`);

  return found;
};

const claude = (descriptor?: ProviderOptionDescriptor) =>
  provider("claudeAgent", "claude-opus-5-5", descriptor ? { descriptor } : {});

describe("seedSquadMember", () => {
  it("uses the role's model and level when its driver is ready", () => {
    const scout = role("scout");

    const seed = seedSquadMember(scout, [
      claude(effortDescriptor("effort", ["low", "medium", "high"], "medium")),
    ]);

    expect(seed.notice).toBeNull();
    expect(seed.engine).toEqual({
      provider: "claudeAgent",
      model: "claude-opus-5-5",
      options: [{ id: "effort", value: "high" }],
      fallbacks: [],
    });
  });

  it("reads the reasoningEffort option id for Codex", () => {
    const tracker = role("tracker");

    const codex = provider("codex", tracker.model.model, {
      descriptor: effortDescriptor("reasoningEffort", ["low", "medium", "high"], "high"),
    });

    const seed = seedSquadMember(tracker, [codex]);

    expect(seed.notice).toBeNull();
    expect(seed.engine?.options).toEqual([{ id: "reasoningEffort", value: "medium" }]);
  });

  it("falls back to the first ready instance's default model when the driver is missing", () => {
    const coach = role("coach");
    const seed = seedSquadMember(coach, [claude()]);

    expect(seed.notice).toBe("provider-fallback");
    expect(seed.engine?.provider).toBe("claudeAgent");
    expect(seed.engine?.model).toBe("claude-opus-5-5");
  });

  it("keeps the role's driver on its default model before switching drivers", () => {
    const scout = role("scout");
    const claudeWithoutOpus = provider("claudeAgent", "claude-sonnet-5-5");
    const codex = provider("codex", "gpt-x");

    const seed = seedSquadMember(scout, [codex, claudeWithoutOpus]);

    expect(seed.notice).toBe("provider-fallback");
    expect(seed.engine?.provider).toBe("claudeAgent");
    expect(seed.engine?.model).toBe("claude-sonnet-5-5");
  });

  it("skips instances that are disabled or signed out", () => {
    const scout = role("scout");

    const seed = seedSquadMember(scout, [
      provider("claudeAgent", "claude-opus-5-5", { enabled: false }),
      provider("codex", "gpt-x", { auth: { status: "unauthenticated" } }),
      provider("grok", "grok-build"),
    ]);

    expect(seed.notice).toBe("provider-fallback");
    expect(seed.engine?.provider).toBe("grok");
    expect(seed.engine?.model).toBe("grok-build");
  });

  it("uses the model's default level and says so when it lacks the role's level", () => {
    const scout = role("scout");

    const seed = seedSquadMember(scout, [
      claude(effortDescriptor("effort", ["low", "medium"], "medium")),
    ]);

    expect(seed.notice).toBe("reasoning-adjusted");
    expect(seed.engine?.options).toEqual([{ id: "effort", value: "medium" }]);
  });

  it("returns no engine and 'no-provider' when nothing is usable", () => {
    const seed = seedSquadMember(role("scout"), [
      provider("claudeAgent", "claude-opus-5-5", { installed: false }),
    ]);

    expect(seed).toEqual({ engine: null, notice: "no-provider" });
    expect(seedSquadMember(role("scout"), [])).toEqual({ engine: null, notice: "no-provider" });
  });
});

describe("seedSquad", () => {
  const software = FLEET_TEMPLATES.find((template) => template.id === "software-engineering")!;

  it("seeds the members in template order, boss first, and names the boss", () => {
    const squad = seedSquad(software, [claude()]);

    expect(squad.bossRoleId).toBe(software.bossRoleId);
    expect(squad.members[0]?.role.id).toBe(software.bossRoleId);
    expect(squad.members.map((member) => member.role.id)).toEqual(
      software.roleIds
        .filter((id) => id === software.bossRoleId)
        .concat(software.roleIds.filter((id) => id !== software.bossRoleId)),
    );
  });

  it("gives each seed its own copy so edits never reach the role library", () => {
    const before = JSON.stringify(FLEET_ROLES);
    const first = seedSquad(software, [claude()]);
    const second = seedSquad(software, [claude()]);

    expect(first.members[0]?.engine).not.toBe(second.members[0]?.engine);

    const engine = first.members[0]?.engine;

    if (engine) {
      (engine as { model: string }).model = "edited";
      (engine.options as Array<{ value: string | boolean }> | undefined)?.forEach((option) => {
        option.value = "edited";
      });
    }

    expect(second.members[0]?.engine?.model).not.toBe("edited");
    expect(JSON.stringify(FLEET_ROLES)).toBe(before);
  });
});
