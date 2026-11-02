import type { ProviderOptionDescriptor } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { runtimeModeChoicesFor, selectableChoices } from "./thread-settings-options";

const effortDescriptor: Extract<ProviderOptionDescriptor, { type: "select" }> = {
  id: "effort",
  label: "Reasoning",
  type: "select",
  options: [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium", isDefault: true },
    { id: "high", label: "High" },
    { id: "ultrathink", label: "Ultrathink" },
    { id: "ultracode", label: "Ultracode" },
  ],
  currentValue: "high",
  promptInjectedValues: ["ultrathink"],
};

describe("selectableChoices", () => {
  it("hides prompt-injected and workflow-trigger choices, keeping declared order", () => {
    expect(selectableChoices(effortDescriptor).map((choice) => choice.id)).toEqual([
      "low",
      "medium",
      "high",
    ]);
  });
});

describe("runtimeModeChoicesFor", () => {
  it("offers every mode to providers that can ask for approval", () => {
    expect(runtimeModeChoicesFor("codex").map((choice) => choice.mode)).toEqual([
      "approval-required",
      "auto-accept-edits",
      "auto",
      "full-access",
    ]);
  });

  it("offers Cursor only read-only and full access, and says what full access does", () => {
    const choices = runtimeModeChoicesFor("cursor");

    expect(choices.map((choice) => [choice.mode, choice.label])).toEqual([
      ["auto", "Read-only"],
      ["full-access", "Full access"],
    ]);
    expect(choices[1]?.description).toContain("without asking");
  });
});
