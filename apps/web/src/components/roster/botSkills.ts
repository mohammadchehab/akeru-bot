import type { BotSkill, SkillId } from "@isnadi/contracts";

/** Sets one skill on or off; a skill the bot does not have leaves the list unchanged. */
export function toggleBotSkill(
  skills: readonly BotSkill[],
  skillId: SkillId,
  enabled: boolean,
): readonly BotSkill[] {
  return skills.map((skill) => (skill.skillId === skillId ? { ...skill, enabled } : skill));
}

export function botSkillsEnabledCount(skills: readonly BotSkill[]): number {
  return skills.filter((skill) => skill.enabled).length;
}

/** Order-independent identity of a skill set, for dirty checks. */
export function botSkillsKey(skills: readonly BotSkill[]): string {
  return skills
    .map((skill) => `${skill.skillId}:${skill.enabled ? 1 : 0}`)
    .toSorted()
    .join(",");
}
