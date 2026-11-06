import type { OrchestrationBot } from "@isnadi/contracts";
import { botEngineModelSelection } from "@isnadi/shared/model";
import { groupByProvider, type ModelOption } from "../../lib/modelOptions";
import { resolveProviderOptionDescriptors } from "../../lib/providerOptions";
import type { ExistingThreadSettingsRouteSession } from "./thread-settings-session";

/** The visible sheet follows bot snapshots even while its composer screen is frozen. */
export function liveBotThreadSettings(
  session: ExistingThreadSettingsRouteSession,
  bot: OrchestrationBot | null,
  models: ReadonlyArray<ModelOption>,
): ExistingThreadSettingsRouteSession {
  if (!session.engineBotRef || !bot || bot.archivedAt !== null) return session;

  const skillsOnCount = bot.skills.filter((skill) => skill.enabled).length;

  if (!bot.engine) return { ...session, skillsOnCount };

  const fallbackCount = bot.engine.fallbacks.length;

  const selection = botEngineModelSelection(bot.engine);

  const model = models.find(
    (candidate) =>
      candidate.selection.instanceId === selection.instanceId &&
      candidate.selection.model === selection.model,
  );

  if (!model) return { ...session, fallbackCount, skillsOnCount };

  return {
    ...session,
    fallbackCount,
    skillsOnCount,
    selectedModel: selection,
    providerGroups: groupByProvider(models).filter(
      (group) => group.providerKey === selection.instanceId,
    ),
    optionDescriptors: resolveProviderOptionDescriptors({
      capabilities: model.capabilities,
      selections: selection.options,
    }),
    onUpdateOptionSelections: (options) =>
      session.onSelectModel({ ...model, selection: { ...selection, options } }),
  };
}
