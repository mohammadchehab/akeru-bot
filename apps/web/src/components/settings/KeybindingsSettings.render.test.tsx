import { PrimaryConnectionTarget } from "@isnadi/client-runtime/connection";
import { EnvironmentId, type ResolvedKeybindingsConfig } from "@isnadi/contracts";
import { DEFAULT_RESOLVED_KEYBINDINGS } from "@isnadi/shared/keybindings";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const fixtures = vi.hoisted(() => {
  const keybindings: ResolvedKeybindingsConfig = [];

  return { keybindings, primaryUrl: "http://127.0.0.1:8000" };
});

vi.mock("@effect/atom-react", () => ({
  useAtomValue: (atom: string) => (atom === "keybindings" ? fixtures.keybindings : null),
}));

vi.mock("../../state/server", () => ({
  primaryServerKeybindingsAtom: "keybindings",
  primaryServerKeybindingsConfigPathAtom: "configPath",
  primaryServerAvailableEditorsAtom: "editors",
  serverEnvironment: {},
}));

vi.mock("../../state/environments", () => ({
  usePrimaryEnvironment: () => ({ environmentId: "environment-1" }),
}));

// The real access hook runs; only the connection the browser reached the server on varies.
vi.mock("../../state/presentation", () => ({
  useEnvironmentPresentation: () => ({
    presentation: {
      entry: {
        target: new PrimaryConnectionTarget({
          environmentId: EnvironmentId.make("environment-1"),
          label: "sol",
          httpBaseUrl: fixtures.primaryUrl,
          wsBaseUrl: fixtures.primaryUrl.replace("http", "ws"),
        }),
      },
    },
  }),
}));

vi.mock("../../editorPreferences", () => ({ useOpenInPreferredEditor: () => vi.fn() }));

vi.mock("../../state/use-atom-command", () => ({ useAtomCommand: () => vi.fn() }));

vi.mock("../../env", () => ({ isElectron: true }));

vi.mock("./settingsLayout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./settingsLayout")>()),
  SettingsPageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { KeybindingsSettingsPanel } from "./KeybindingsSettings";

function render(): string {
  return renderToStaticMarkup(<KeybindingsSettingsPanel />);
}

describe("KeybindingsSettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    // A plain browser: no desktop bridge.
    vi.stubGlobal("window", {});
    fixtures.keybindings = DEFAULT_RESOLVED_KEYBINDINGS;
    fixtures.primaryUrl = "http://127.0.0.1:8000";
  });

  it("offers Open keybindings.json when the browser is on the server machine", () => {
    expect(render()).toContain('aria-label="Open keybindings.json"');
  });

  it("hides Open keybindings.json for a tailnet primary", () => {
    fixtures.primaryUrl = "https://sol.tail1234.ts.net";

    expect(render()).not.toContain("Open keybindings.json");
  });

  it("renders purpose groups with collapsed numbered series", () => {
    const html = render();

    for (const title of ["General", "Chats", "Composer &amp; models", "Layout"]) {
      expect(html).toContain(`aria-label="${title}"`);
    }

    expect(html).not.toContain('aria-label="Browser preview"');
    expect(html).not.toContain("the terminal is focused");
    expect(html).toContain("Jump to chat 1–9");
    expect(html).toContain("Pick model 1–9");
    expect(html).not.toContain("Jump to chat 4");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Change shortcut for Open command palette, currently ⌘ K");
    expect(html).toContain("Add condition for Open command palette");
    expect(html).not.toContain("Conflicts");
  });

  it("surfaces conflicts with a review action and a filter", () => {
    fixtures.keybindings = [
      ...DEFAULT_RESOLVED_KEYBINDINGS,
      {
        command: "sidebar.toggle",
        shortcut: {
          key: "k",
          modKey: true,
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        },
      },
    ];
    const html = render();

    expect(html).toContain("2 shortcuts share their keys with another command.");
    expect(html).toContain(">Review<");
    expect(html).toContain("Conflicts");
    expect(html).toContain("Conflict. Same keys as Toggle sidebar.");
    expect(html).toContain(">Custom<");
  });
});
