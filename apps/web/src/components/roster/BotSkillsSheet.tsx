import type { SkillId } from "@isnadi/contracts";
import { SparklesIcon } from "lucide-react";

import { useI18n } from "../../i18n";
import { SettingsRow } from "../settings/settingsLayout";
import { Switch } from "../ui/switch";
import { BotSideSheet, BotSideSheetEmpty, BotSideSheetSection } from "./BotSideSheet";
import { botSkillsEnabledCount, toggleBotSkill } from "./botSkills";
import type { Bot } from "./types";
import type { BotProfileDraft } from "./useBotProfileDraft";

type BotSkillList = NonNullable<Bot["skills"]>;

/** The skill switches and the registry access switch, edited as part of the bot's draft. */
export function BotSkillsList({
  botName,
  skills,
  registryAccess,
  onSkillChange,
  onRegistryAccessChange,
}: {
  readonly botName: string;
  readonly skills: BotSkillList;
  readonly registryAccess: boolean;
  readonly onSkillChange: (skillId: SkillId, enabled: boolean) => void;
  readonly onRegistryAccessChange: (enabled: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <BotSideSheetSection
        title={t("Bot skills")}
        action={
          skills.length > 0 ? (
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {t("{on} of {total} on", { on: botSkillsEnabledCount(skills), total: skills.length })}
            </span>
          ) : null
        }
      >
        {skills.length === 0 ? (
          <BotSideSheetEmpty
            icon={SparklesIcon}
            title={t("No skills yet")}
            description={t("Skills you give {name} show up here.", { name: botName })}
          />
        ) : (
          <div>
            {skills.map((skill) => (
              <SettingsRow
                key={skill.skillId}
                title={<span className="truncate">{skill.skillId}</span>}
                control={
                  <Switch
                    checked={skill.enabled}
                    onCheckedChange={(next) => onSkillChange(skill.skillId, Boolean(next))}
                    aria-label={
                      skill.enabled
                        ? t("Turn off {skill} for {name}", { skill: skill.skillId, name: botName })
                        : t("Turn on {skill} for {name}", { skill: skill.skillId, name: botName })
                    }
                  />
                }
              />
            ))}
          </div>
        )}
      </BotSideSheetSection>

      <SettingsRow
        title={t("Use other skills from the registry")}
        description={t("Let {name} find and load registry skills it has not been given.", {
          name: botName,
        })}
        control={
          <Switch
            checked={registryAccess}
            onCheckedChange={(next) => onRegistryAccessChange(Boolean(next))}
            aria-label={t("Use other skills from the registry")}
          />
        }
      />
    </>
  );
}

/** Per-bot skills panel; changes stay in the draft until the settings page saves. */
export function BotSkillsSheet({
  bot,
  draft,
  open,
  onOpenChange,
}: {
  readonly bot: Bot;
  readonly draft: BotProfileDraft;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <BotSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("Skills")}
      description={t("What {name} can load on demand.", { name: bot.name })}
    >
      <BotSkillsList
        botName={bot.name}
        skills={draft.skills}
        registryAccess={draft.skillRegistryAccess}
        onSkillChange={(skillId, enabled) => {
          draft.setSkills(toggleBotSkill(draft.skills, skillId, enabled));
          draft.markChanged();
        }}
        onRegistryAccessChange={(enabled) => {
          draft.setSkillRegistryAccess(enabled);
          draft.markChanged();
        }}
      />
    </BotSideSheet>
  );
}
