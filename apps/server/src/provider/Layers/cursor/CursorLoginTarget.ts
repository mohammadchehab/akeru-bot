/**
 * Which `agent` a sign-in talks to. A Cursor instance can have its own binary path and environment
 * variables (for example a different config directory), and the adapter spawns with those, so
 * login and logout must too, or they would sign in to the wrong place.
 *
 * @module provider/Layers/cursor/CursorLoginTarget
 */
import { CursorSettings, type ProviderInstanceId, type ServerSettings } from "@isnadi/contracts";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import { mergeSubscriptionInstanceEnvironment } from "../../../subscription-auth/runtime.ts";
import { deriveProviderInstanceConfigMap } from "../ProviderInstanceRegistryHydration.ts";

const decodeCursorSettings = Schema.decodeUnknownOption(CursorSettings);

export interface CursorLoginTarget {
  readonly binaryPath: string;
  readonly env: NodeJS.ProcessEnv;
}

export function resolveCursorLoginTarget(
  settings: ServerSettings,
  instanceId: ProviderInstanceId,
): Result.Result<CursorLoginTarget, string> {
  const entry = Object.entries(deriveProviderInstanceConfigMap(settings)).find(
    ([id]) => id === instanceId,
  )?.[1];

  if (entry === undefined) {
    return Result.fail(`There is no provider instance "${instanceId}".`);
  }

  if (entry.driver !== "cursor") {
    return Result.fail(`"${instanceId}" is not a Cursor instance.`);
  }

  const config = decodeCursorSettings(entry.config ?? {});

  return Result.succeed({
    binaryPath: Option.match(config, {
      onNone: () => "agent",
      onSome: (decoded) => decoded.binaryPath || "agent",
    }),
    env: mergeSubscriptionInstanceEnvironment(entry.environment),
  });
}
