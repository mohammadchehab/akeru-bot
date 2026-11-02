import { PrimaryConnectionTarget } from "@isnadi/client-runtime/connection";
import { EnvironmentId } from "@isnadi/contracts";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const fixtures = vi.hoisted(() => ({ primaryUrl: "http://127.0.0.1:8000" }));

vi.mock("@effect/atom-react", () => ({
  useAtomValue: (atom: string) =>
    atom === "observability" ? { logsDirectoryPath: "/home/isnadi/logs" } : [],
}));

vi.mock("../../state/server", () => ({
  primaryServerObservabilityAtom: "observability",
  primaryServerAvailableEditorsAtom: "editors",
  serverEnvironment: {
    traceDiagnostics: () => null,
    processDiagnostics: () => null,
    processResourceHistory: () => null,
    signalProcess: null,
  },
}));

vi.mock("../../state/shell", () => ({ shellEnvironment: {} }));

vi.mock("../../state/environments", () => ({
  usePrimaryEnvironment: () => ({ environmentId: "environment-1" }),
}));

vi.mock("../../state/query", () => ({
  useEnvironmentQuery: () => ({ data: null, error: null, isPending: false, refresh: vi.fn() }),
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

vi.mock("../../state/use-atom-command", () => ({ useAtomCommand: () => vi.fn() }));

vi.mock("./ResourceTelemetryDiagnostics", () => ({ ResourceTelemetryDiagnostics: () => null }));

vi.mock("./settingsLayout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./settingsLayout")>()),
  SettingsPageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { DiagnosticsSettingsPanel } from "./DiagnosticsSettings";

function render(): string {
  return renderToStaticMarkup(<DiagnosticsSettingsPanel />);
}

describe("DiagnosticsSettingsPanel", () => {
  beforeEach(() => {
    // A plain browser: no desktop bridge.
    vi.stubGlobal("window", {});
    fixtures.primaryUrl = "http://127.0.0.1:8000";
  });

  it("offers Open logs folder when the browser is on the server machine", () => {
    expect(render()).toContain('aria-label="Open logs folder"');
  });

  it("hides Open logs folder for a tailnet primary", () => {
    fixtures.primaryUrl = "https://sol.tail1234.ts.net";

    expect(render()).not.toContain("Open logs folder");
  });
});
