/** Env vars that carry vault key material. They are read once at startup and never reach a child process. */
export const MASTER_KEY_ENV_VARS = ["ISNADI_MASTER_KEY", "ISNADI_MASTER_PASSPHRASE"] as const;

export type CapturedMasterKeyEnv = {
  readonly ISNADI_MASTER_KEY: string | undefined;
  readonly ISNADI_MASTER_PASSPHRASE: string | undefined;
};

/** Moves the master key variables out of `env`, so nothing spawned later inherits them. */
export function takeMasterKeyEnv(env: NodeJS.ProcessEnv): CapturedMasterKeyEnv {
  const taken = {
    ISNADI_MASTER_KEY: env.ISNADI_MASTER_KEY,
    ISNADI_MASTER_PASSPHRASE: env.ISNADI_MASTER_PASSPHRASE,
  };

  for (const name of MASTER_KEY_ENV_VARS) delete env[name];

  return taken;
}

/** A copy of `env` without the master key variables, for any child process environment built from caller input. */
export function withoutMasterKeyEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const copy = { ...env };

  for (const name of MASTER_KEY_ENV_VARS) delete copy[name];

  return copy;
}

/** The variables that are set, for handing the key material to the one child that is meant to read it. */
export function definedEntries(captured: CapturedMasterKeyEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(captured).filter(([, value]) => value !== undefined));
}

/** Environment for the server child a launcher starts: the captured key material goes back in, since the server is its one reader. */
export function serverChildEnv(
  base: NodeJS.ProcessEnv,
  captured: CapturedMasterKeyEnv,
  extra: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return { ...base, ...definedEntries(captured), ...extra };
}

/**
 * Captured when this module first loads, which bin.ts does before anything
 * spawns. The vault reads its key material from here, never from process.env.
 */
export const capturedMasterKeyEnv: CapturedMasterKeyEnv = takeMasterKeyEnv(process.env);
