/**
 * Cursor provider status: CLI presence and version, login state, and the account's live model
 * list. All three come from the user's own `agent` CLI; IsnadiBot stores no Cursor secret.
 *
 * @module provider/Layers/CursorProvider
 */
import {
  type CursorSettings,
  type ModelCapabilities,
  type ServerProviderAuth,
  type ServerProviderModel,
} from "@isnadi/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { createModelCapabilities } from "@isnadi/shared/model";
import { resolveSpawnCommand } from "@isnadi/shared/shell";

import {
  AUTH_PROBE_TIMEOUT_MS,
  buildServerProvider,
  isCommandMissingCause,
  parseGenericCliVersion,
  providerModelsFromSettings,
  spawnAndCollect,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";
import { parseCursorStatus } from "./cursor/CursorStatus.ts";

const CURSOR_PRESENTATION = {
  displayName: "Cursor",
  badgeLabel: "Early Access",
  showInteractionModeToggle: false,
} as const;

const CURSOR_API_KEY_ENV = "CURSOR_API_KEY";

const VERSION_PROBE_TIMEOUT_MS = 4_000;

const EMPTY_CAPABILITIES: ModelCapabilities = createModelCapabilities({ optionDescriptors: [] });

/** `auto` exists on every account; the real list replaces it once the CLI answers. */
const CURSOR_BUILT_IN_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: "auto",
    name: "Auto",
    isCustom: false,
    isDefault: true,
    capabilities: EMPTY_CAPABILITIES,
  },
];

const MODEL_LINE = /^(\S+) - (.+)$/;

const DEFAULT_MARK = /\s*\(default\)\s*$/i;

/**
 * Parses `agent --list-models`: a heading, then `id - Label` lines (the default carries
 * `(default)`), then a tip. Parameterised ids (`id[effort=high]`) pass through unchanged.
 */
export function parseCursorModelsOutput(output: string): ReadonlyArray<ServerProviderModel> {
  const seen = new Set<string>();
  const models: ServerProviderModel[] = [];

  for (const line of output.split(/\r?\n/)) {
    const match = MODEL_LINE.exec(line.trim());

    if (match === null || seen.has(match[1]!)) continue;

    const slug = match[1]!;
    const label = match[2]!;

    seen.add(slug);
    models.push({
      slug,
      name: label.replace(DEFAULT_MARK, ""),
      isCustom: false,
      ...(DEFAULT_MARK.test(label) ? { isDefault: true } : {}),
      capabilities: EMPTY_CAPABILITIES,
    });
  }

  return models;
}

function cursorModelsFromSettings(
  customModels: ReadonlyArray<string>,
  builtInModels: ReadonlyArray<ServerProviderModel> = CURSOR_BUILT_IN_MODELS,
): ReadonlyArray<ServerProviderModel> {
  return providerModelsFromSettings(builtInModels, customModels, EMPTY_CAPABILITIES);
}

export function buildInitialCursorProviderSnapshot(
  cursorSettings: CursorSettings,
): Effect.Effect<ServerProviderDraft> {
  return Effect.gen(function* () {
    const checkedAt = DateTime.formatIso(yield* DateTime.now);

    return buildServerProvider({
      presentation: CURSOR_PRESENTATION,
      enabled: cursorSettings.enabled,
      checkedAt,
      models: cursorModelsFromSettings(cursorSettings.customModels),
      probe: cursorSettings.enabled
        ? {
            installed: true,
            version: null,
            status: "warning",
            auth: { status: "unknown" },
            message: "Checking Cursor CLI availability...",
          }
        : {
            installed: false,
            version: null,
            status: "warning",
            auth: { status: "unknown" },
            message: "Cursor is disabled in IsnadiBot settings.",
          },
    });
  });
}

const runCursorCli = (
  cursorSettings: CursorSettings,
  args: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv,
) =>
  Effect.gen(function* () {
    const command = cursorSettings.binaryPath || "agent";
    const spawnCommand = yield* resolveSpawnCommand(command, args, { env: environment });

    return yield* spawnAndCollect(
      command,
      ChildProcess.make(spawnCommand.command, spawnCommand.args, {
        env: environment,
        shell: spawnCommand.shell,
      }),
    );
  });

export const checkCursorProviderStatus = Effect.fn("checkCursorProviderStatus")(function* (
  cursorSettings: CursorSettings,
  environment: NodeJS.ProcessEnv = process.env,
): Effect.fn.Return<ServerProviderDraft, never, ChildProcessSpawner.ChildProcessSpawner> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  const fallbackModels = cursorModelsFromSettings(cursorSettings.customModels);

  const snapshot = (
    probe: Parameters<typeof buildServerProvider>[0]["probe"],
    models = fallbackModels,
  ) =>
    buildServerProvider({
      presentation: CURSOR_PRESENTATION,
      enabled: cursorSettings.enabled,
      checkedAt,
      models,
      probe,
    });

  if (!cursorSettings.enabled) {
    return snapshot({
      installed: false,
      version: null,
      status: "warning",
      auth: { status: "unknown" },
      message: "Cursor is disabled in IsnadiBot settings.",
    });
  }

  const versionResult = yield* runCursorCli(cursorSettings, ["--version"], environment).pipe(
    Effect.timeoutOption(VERSION_PROBE_TIMEOUT_MS),
    Effect.result,
  );

  if (Result.isFailure(versionResult)) {
    const missing = isCommandMissingCause(versionResult.failure);

    return snapshot({
      installed: !missing,
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message: missing
        ? "Cursor CLI (`agent`) is not installed or not on PATH."
        : "Failed to execute Cursor CLI health check.",
    });
  }

  if (Option.isNone(versionResult.success)) {
    return snapshot({
      installed: true,
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message: "Cursor CLI is installed but timed out while running `agent --version`.",
    });
  }

  const versionOutput = versionResult.success.value;
  const version = parseGenericCliVersion(`${versionOutput.stdout}\n${versionOutput.stderr}`);

  if (versionOutput.code !== 0) {
    return snapshot({
      installed: true,
      version,
      status: "error",
      auth: { status: "unknown" },
      message: "Cursor CLI is installed but failed to run.",
    });
  }

  // `agent status` exits 0 logged in or out, so its text decides.
  const statusResult = yield* runCursorCli(cursorSettings, ["status"], environment).pipe(
    Effect.timeoutOption(AUTH_PROBE_TIMEOUT_MS),
    Effect.result,
  );

  const status =
    Result.isSuccess(statusResult) && Option.isSome(statusResult.success)
      ? parseCursorStatus(
          `${statusResult.success.value.stdout}\n${statusResult.success.value.stderr}`,
        )
      : undefined;

  const auth: ServerProviderAuth = environment[CURSOR_API_KEY_ENV]?.trim()
    ? { status: "authenticated", type: "api_key", label: "Cursor API key" }
    : status?.authenticated === true
      ? { status: "authenticated", type: "cached_token", label: status.email ?? "Cursor account" }
      : status === undefined
        ? { status: "unknown" }
        : { status: "unauthenticated" };

  if (auth.status === "unauthenticated") {
    return snapshot({
      installed: true,
      version,
      status: "error",
      auth,
      message: "Cursor CLI is installed but not logged in. Run `agent login`.",
    });
  }

  // Models are per account and only listed once signed in; keep `auto` when the list is empty.
  const modelsResult = yield* runCursorCli(cursorSettings, ["--list-models"], environment).pipe(
    Effect.timeoutOption(AUTH_PROBE_TIMEOUT_MS),
    Effect.result,
  );

  const listed =
    Result.isSuccess(modelsResult) &&
    Option.isSome(modelsResult.success) &&
    modelsResult.success.value.code === 0
      ? parseCursorModelsOutput(modelsResult.success.value.stdout)
      : [];

  return snapshot(
    { installed: true, version, status: "ready", auth },
    listed.length > 0
      ? cursorModelsFromSettings(cursorSettings.customModels, listed)
      : fallbackModels,
  );
});
