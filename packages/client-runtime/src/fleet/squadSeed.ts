import {
  DEFAULT_MODEL_BY_PROVIDER,
  fleetTemplateRoles,
  type BotEngine,
  type FleetRole,
  type FleetRoleId,
  type FleetTemplate,
  type ProviderOptionSelection,
  type ServerProvider,
  type ServerProviderModel,
} from "@isnadi/contracts";

import { providerAvailabilityReason } from "../providerAvailability.ts";

/** Why a seeded engine differs from what the role asked for. */
export type SquadSeedNotice = "provider-fallback" | "reasoning-adjusted" | "no-provider";

export interface SquadMemberSeed {
  readonly engine: BotEngine | null;
  readonly notice: SquadSeedNotice | null;
}

export interface SquadSeed {
  readonly bossRoleId: FleetRoleId;
  readonly members: ReadonlyArray<SquadMemberSeed & { readonly role: FleetRole }>;
}

const REASONING_OPTION_IDS = new Set(["reasoningEffort", "effort"]);

interface ReasoningSeed {
  readonly options: ProviderOptionSelection[];
  readonly adjusted: boolean;
}

function reasoningOptions(model: ServerProviderModel | undefined, wanted: string): ReasoningSeed {
  const descriptor = model?.capabilities?.optionDescriptors?.find(
    (candidate) => candidate.type === "select" && REASONING_OPTION_IDS.has(candidate.id),
  );

  if (descriptor?.type !== "select" || descriptor.options.length === 0) {
    return { options: [], adjusted: false };
  }

  if (descriptor.options.some((option) => option.id === wanted)) {
    return { options: [{ id: descriptor.id, value: wanted }], adjusted: false };
  }

  const fallback = descriptor.options.find((option) => option.isDefault) ?? descriptor.options[0];

  return { options: fallback ? [{ id: descriptor.id, value: fallback.id }] : [], adjusted: true };
}

function defaultModelSlug(provider: ServerProvider): string | undefined {
  return (
    provider.models.find((model) => model.isDefault)?.slug ??
    provider.models[0]?.slug ??
    DEFAULT_MODEL_BY_PROVIDER[provider.driver]
  );
}

/**
 * Picks the engine a new squad member starts with. A role names a driver, so
 * the first ready instance of that driver wins; otherwise any ready instance
 * stands in with its own default model, and the notice says so.
 */
export function seedSquadMember(
  role: FleetRole,
  providers: ReadonlyArray<ServerProvider>,
): SquadMemberSeed {
  const exact = providers.find(
    (provider) =>
      provider.driver === role.model.driver &&
      providerAvailabilityReason(provider, role.model.model) === null,
  );

  const stand = exact
    ? undefined
    : providers.find((provider) => providerAvailabilityReason(provider) === null);

  const provider = exact ?? stand;
  const model = exact ? role.model.model : provider ? defaultModelSlug(provider) : undefined;

  if (!provider || !model) return { engine: null, notice: "no-provider" };

  const { options, adjusted } = reasoningOptions(
    provider.models.find((candidate) => candidate.slug === model),
    role.reasoning,
  );

  return {
    engine: {
      provider: provider.instanceId,
      model,
      ...(options.length > 0 ? { options } : {}),
      fallbacks: [],
    },
    notice: exact ? (adjusted ? "reasoning-adjusted" : null) : "provider-fallback",
  };
}

/** Seeds every member of a template, boss first. Each member gets its own copy. */
export function seedSquad(
  template: FleetTemplate,
  providers: ReadonlyArray<ServerProvider>,
): SquadSeed {
  return {
    bossRoleId: template.bossRoleId,
    members: fleetTemplateRoles(template).map((role) => ({
      role,
      ...seedSquadMember(role, providers),
    })),
  };
}
