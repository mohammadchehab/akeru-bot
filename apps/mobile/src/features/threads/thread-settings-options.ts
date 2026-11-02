import type { ProviderOptionDescriptor, RuntimeMode } from "@isnadi/contracts";

/**
 * Desktop-oriented effort keywords that don't belong in the phone picker.
 * Prompt-injected values (ultrathink and friends) are filtered from the
 * descriptor metadata; ultracode is a real option but a workflow trigger, not
 * a reasoning level. A value set elsewhere still displays, it just isn't
 * offered.
 */
const HIDDEN_EFFORT_OPTION_IDS: ReadonlySet<string> = new Set(["ultracode"]);

export const RUNTIME_MODE_CHOICES: ReadonlyArray<{
  readonly mode: RuntimeMode;
  readonly label: string;
  readonly description: string;
}> = [
  {
    mode: "approval-required",
    label: "Supervised",
    description: "Ask before commands and file changes.",
  },
  {
    mode: "auto-accept-edits",
    label: "Auto-accept edits",
    description: "Auto-approve edits, ask before other actions.",
  },
  {
    mode: "auto",
    label: "Auto",
    description: "Supported providers approve routine actions; others still ask.",
  },
  {
    mode: "full-access",
    label: "Full access",
    description: "Allow commands and edits without prompts.",
  },
];

/**
 * Cursor cannot pause a turn to ask, so it runs read-only unless it is given full access. Every
 * other provider keeps the full list.
 */
export function runtimeModeChoicesFor(driver: string | null) {
  return driver === "cursor" ? CURSOR_RUNTIME_MODE_CHOICES : RUNTIME_MODE_CHOICES;
}

/**
 * The label for the active mode. Cursor treats every mode but full access as read-only, so a chat
 * that carries another mode still reads as Read-only.
 */
export function runtimeModeLabel(driver: string | null, mode: RuntimeMode) {
  const choices = runtimeModeChoicesFor(driver);

  return (
    choices.find((choice) => choice.mode === mode)?.label ??
    (driver === "cursor" ? "Read-only" : undefined)
  );
}

const CURSOR_RUNTIME_MODE_CHOICES: typeof RUNTIME_MODE_CHOICES = [
  {
    mode: "auto",
    label: "Read-only",
    description: "Cursor reads and answers; it does not edit files or run commands.",
  },
  {
    mode: "full-access",
    label: "Full access",
    description: "Cursor edits files and runs commands without asking.",
  },
];

export function selectableChoices(
  descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>,
) {
  const injected = new Set(descriptor.promptInjectedValues ?? []);

  return descriptor.options.filter(
    (option) => !injected.has(option.id) && !HIDDEN_EFFORT_OPTION_IDS.has(option.id),
  );
}
