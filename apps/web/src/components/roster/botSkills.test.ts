import { SkillId, type BotSkill } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { botSkillsEnabledCount, botSkillsKey, toggleBotSkill } from "./botSkills";

const skill = (id: string, enabled: boolean): BotSkill => ({ skillId: SkillId.make(id), enabled });

describe("botSkills", () => {
  it("flips only the named skill", () => {
    const next = toggleBotSkill([skill("a", true), skill("b", false)], SkillId.make("b"), true);

    expect(next).toEqual([skill("a", true), skill("b", true)]);
  });

  it("leaves the list alone for an unknown skill", () => {
    const skills = [skill("a", true)];

    expect(toggleBotSkill(skills, SkillId.make("zzz"), false)).toEqual(skills);
  });

  it("counts enabled skills", () => {
    expect(botSkillsEnabledCount([skill("a", true), skill("b", false), skill("c", true)])).toBe(2);
  });

  it("compares sets regardless of order", () => {
    expect(botSkillsKey([skill("a", true), skill("b", false)])).toBe(
      botSkillsKey([skill("b", false), skill("a", true)]),
    );
    expect(botSkillsKey([skill("a", true)])).not.toBe(botSkillsKey([skill("a", false)]));
  });
});
