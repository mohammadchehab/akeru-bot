import * as NodeFS from "node:fs";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { CursorSettings } from "@isnadi/contracts";

import {
  buildInitialCursorProviderSnapshot,
  checkCursorProviderStatus,
  parseCursorModelsOutput,
} from "./CursorProvider.ts";

const decodeCursorSettings = Schema.decodeSync(CursorSettings);

const fixture = (name: string) =>
  NodeFS.readFileSync(new URL(`./cursor/fixtures/${name}`, import.meta.url), "utf8");

describe("parseCursorModelsOutput", () => {
  it("reads `id - label` lines and marks the default, skipping the heading and tip", () => {
    const models = parseCursorModelsOutput(fixture("list-models.txt"));

    expect(models[0]).toMatchObject({ slug: "auto", name: "Auto", isDefault: true });
    expect(models.map((model) => model.slug)).toContain("gpt-5.3-codex-high");
    expect(models.some((model) => model.slug.startsWith("Tip"))).toBe(false);
  });

  it("passes parameterised ids through unchanged", () => {
    expect(
      parseCursorModelsOutput("claude-opus-4-8[effort=high,fast=false] - Opus 4.8 High\n")[0],
    ).toMatchObject({ slug: "claude-opus-4-8[effort=high,fast=false]", name: "Opus 4.8 High" });
  });

  it("returns nothing for unrecognised output", () => {
    expect(parseCursorModelsOutput("Error: Authentication required.\n")).toEqual([]);
  });
});

describe("buildInitialCursorProviderSnapshot", () => {
  it.effect("is disabled by default: Cursor is opt-in", () =>
    Effect.gen(function* () {
      const snapshot = yield* buildInitialCursorProviderSnapshot(decodeCursorSettings({}));

      expect(snapshot.enabled).toBe(false);
      expect(snapshot.models.map((model) => model.slug)).toEqual(["auto"]);
    }),
  );
});

describe("checkCursorProviderStatus", () => {
  // A shell stand-in for the Cursor CLI: canned text for `--version`, `status` and `--list-models`.
  const writeFakeCursorCli = (input: {
    readonly status: string;
    readonly models: string;
    readonly versionExit?: number;
  }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "isnadi-cursor-probe-" });
      yield* fs.writeFileString(path.join(dir, "status.txt"), input.status);
      yield* fs.writeFileString(path.join(dir, "models.txt"), input.models);
      const agentPath = path.join(dir, "agent");
      yield* fs.writeFileString(
        agentPath,
        [
          "#!/bin/sh",
          `d=${JSON.stringify(dir)}`,
          'case "$1" in',
          `  --version) printf "2026.10.22-27dcf5f\\n"; exit ${input.versionExit ?? 0};;`,
          '  status) cat "$d/status.txt"; exit 0;;',
          '  --list-models) cat "$d/models.txt"; exit 0;;',
          "esac",
          "exit 1",
          "",
        ].join("\n"),
      );
      yield* fs.chmod(agentPath, 0o755);

      return agentPath;
    });

  const check = (
    input: Parameters<typeof writeFakeCursorCli>[0],
    environment: NodeJS.ProcessEnv = {},
  ) =>
    Effect.scoped(
      Effect.gen(function* () {
        const binaryPath = yield* writeFakeCursorCli(input);

        return yield* checkCursorProviderStatus(
          decodeCursorSettings({ enabled: true, binaryPath }),
          environment,
        );
      }),
    );

  it.effect("reports a disabled provider without probing", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkCursorProviderStatus(
        decodeCursorSettings({ binaryPath: "/nope/agent" }),
      );

      expect(snapshot).toMatchObject({ enabled: false, installed: false });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reports the binary as missing when the path does not resolve", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkCursorProviderStatus(
        decodeCursorSettings({ enabled: true, binaryPath: "/definitely/not/installed/agent" }),
      );

      expect(snapshot).toMatchObject({ installed: false, status: "error" });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("is ready when logged in, records the CLI version and lists the live models", () =>
    Effect.gen(function* () {
      const snapshot = yield* check({
        status: "✓ Logged in as dev@example.com\nTeam: Example (id 1)\n",
        models: fixture("list-models.txt"),
      });

      expect(snapshot).toMatchObject({
        installed: true,
        status: "ready",
        // The shared parser keeps the date part, which is what the PR3 version gate compares.
        version: "2026.10.22",
        auth: { status: "authenticated" },
      });
      expect(snapshot.models.map((model) => model.slug)).toContain("gpt-5.3-codex-high");
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("is unauthenticated from the status text even though the command exits 0", () =>
    Effect.gen(function* () {
      const snapshot = yield* check({ status: "Not logged in\n", models: "" });

      expect(snapshot).toMatchObject({ status: "error", auth: { status: "unauthenticated" } });
      expect(snapshot.message).toContain("agent login");
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("treats CURSOR_API_KEY as authenticated and never reports the key", () =>
    Effect.gen(function* () {
      const snapshot = yield* check(
        { status: "Not logged in\n", models: fixture("list-models.txt") },
        { CURSOR_API_KEY: "key-secret-value" },
      );

      expect(snapshot).toMatchObject({ status: "ready", auth: { status: "authenticated" } });
      expect(JSON.stringify(snapshot)).not.toContain("key-secret-value");
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("falls back to the built-in `auto` model when the model list is empty", () =>
    Effect.gen(function* () {
      const snapshot = yield* check({ status: "✓ Logged in as dev@example.com\n", models: "" });

      expect(snapshot.models.map((model) => model.slug)).toEqual(["auto"]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reports an installed CLI as unhealthy when --version exits non-zero", () =>
    Effect.gen(function* () {
      const snapshot = yield* check({ status: "", models: "", versionExit: 2 });

      expect(snapshot).toMatchObject({ installed: true, status: "error" });
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
