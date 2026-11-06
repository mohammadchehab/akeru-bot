import { SkillId } from "@isnadi/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { BotSkillsList } from "./BotSkillsSheet";

const skills = [
  { skillId: SkillId.make("release-notes"), enabled: true },
  { skillId: SkillId.make("triage"), enabled: false },
];

function render(overrides: Partial<Parameters<typeof BotSkillsList>[0]> = {}) {
  return renderToStaticMarkup(
    <BotSkillsList
      botName="Scout"
      skills={skills}
      registryAccess={false}
      onSkillChange={vi.fn()}
      onRegistryAccessChange={vi.fn()}
      {...overrides}
    />,
  );
}

describe("BotSkillsList", () => {
  it("lists each skill with a labelled switch", () => {
    const html = render();

    expect(html).toContain("release-notes");
    expect(html).toContain("triage");
    expect(html).toContain("Turn off release-notes for Scout");
    expect(html).toContain("Turn on triage for Scout");
  });

  it("shows how many skills are on", () => {
    expect(render()).toContain("1 of 2 on");
  });

  it("explains an empty skill set", () => {
    expect(render({ skills: [] })).toContain("No skills yet");
  });

  it("offers the registry access switch", () => {
    expect(render({ registryAccess: true })).toContain("Use other skills from the registry");
  });

  it("keeps the reset action out until role defaults exist", () => {
    expect(render()).not.toContain("Reset to role defaults");
  });
});
