/** Env vars that carry vault key material. They are read once at startup and never reach a child process. */
export const MASTER_KEY_ENV_VARS = ["ISNADI_MASTER_KEY", "ISNADI_MASTER_PASSPHRASE"] as const;

export type CapturedMasterKeyEnv = Readonly<Record<string, string | undefined>>;

/** Moves the master key variables out of `env`, so nothing spawned later inherits them. */
export function takeMasterKeyEnv(env: NodeJS.ProcessEnv): CapturedMasterKeyEnv {
  const taken: Record<string, string | undefined> = {};

  for (const name of MASTER_KEY_ENV_VARS) {
    taken[name] = env[name];
    delete env[name];
  }

  return taken;
}

/** A copy of `env` without the master key variables, for any child process environment built from caller input. */
export function withoutMasterKeyEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const copy = { ...env };

  for (const name of MASTER_KEY_ENV_VARS) delete copy[name];

  return copy;
}

/**
 * Captured when this module first loads, which bin.ts does before anything
 * spawns. The vault reads its key material from here, never from process.env.
 */
export const capturedMasterKeyEnv: CapturedMasterKeyEnv = takeMasterKeyEnv(process.env);
