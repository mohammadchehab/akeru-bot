import { describe, expect, it, vi } from "vite-plus/test";

import { keybindingsToastAction } from "./-keybindingsToastAction";

describe("keybindingsToastAction", () => {
  it("offers Open keybindings.json when the browser is on the server machine", () => {
    const onOpen = vi.fn();
    const action = keybindingsToastAction({
      canOpenInEditor: true,
      label: "Open keybindings.json",
      onOpen,
    });

    expect(action).toEqual({
      actionVariant: "outline",
      actionProps: { children: "Open keybindings.json", onClick: onOpen },
    });
  });

  it("leaves the toast without an action without local shell access", () => {
    expect(
      keybindingsToastAction({
        canOpenInEditor: false,
        label: "Open keybindings.json",
        onOpen: vi.fn(),
      }),
    ).toEqual({});
  });
});
