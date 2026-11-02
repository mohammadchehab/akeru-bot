/**
 * The "Open keybindings.json" button of the invalid-keybindings toast. The editor opens on the
 * server machine, so a remote client gets the warning without the action.
 */
export function keybindingsToastAction(input: {
  readonly canOpenInEditor: boolean;
  readonly label: string;
  readonly onOpen: () => void;
}) {
  if (!input.canOpenInEditor) return {};

  return {
    actionVariant: "outline" as const,
    actionProps: { children: input.label, onClick: input.onOpen },
  };
}
