import type { ProviderInstanceEnvironment } from "@isnadi/contracts";

import { withoutMasterKeyEnv } from "../vault/masterKeyEnv.ts";

export function mergeProviderInstanceEnvironment(
  environment: ProviderInstanceEnvironment | undefined,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  if (!environment || environment.length === 0) {
    return withoutMasterKeyEnv(baseEnv);
  }

  const next: NodeJS.ProcessEnv = { ...baseEnv };

  for (const variable of environment) {
    next[variable.name] = variable.value;
  }

  return withoutMasterKeyEnv(next);
}

export function explicitProviderInstanceEnvironment(
  environment: ProviderInstanceEnvironment | undefined,
): NodeJS.ProcessEnv {
  return Object.fromEntries(environment?.map((variable) => [variable.name, variable.value]) ?? []);
}
