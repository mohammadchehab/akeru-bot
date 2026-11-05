import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import {
  type KeyringEntryFactory,
  keychainAccountFor,
  makeKeyringPort,
} from "./keychainAdapter.ts";
import {
  type MasterKeyFailure,
  type MasterKeySource,
  resolveMasterKey,
} from "./masterKey.ts";
import {
  type InMemorySecretVault,
  makeInMemorySecretVault,
} from "./SecretVault.ts";
import { makeVaultFileKeyStore, makeVaultFilePersistence } from "./vaultFile.ts";

export const VAULT_FILE_NAME = "vault.json";

export type OpenVaultInput = {
  /** Isnadi home; the keychain item is per home, so a dev home never reads the real install's key. */
  readonly homeDir: string;
  readonly stateDir: string;
  /** The key material captured at process start (see `capturedMasterKeyEnv`), not `process.env`. */
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly createKeyringEntry: KeyringEntryFactory | undefined;
};

export type OpenVaultResult =
  | (InMemorySecretVault & {
      readonly ok: true;
      readonly keyId: string;
      readonly source: MasterKeySource;
    })
  | { readonly ok: false; readonly reason: MasterKeyFailure | "vault-file-unreadable" };

const canonical = (dir: string): string => {
  try {
    return NodeFS.realpathSync(dir);
  } catch {
    return NodePath.resolve(dir);
  }
};

/**
 * Resolves the master key and opens the sealed vault file in the state directory.
 * Never throws: every failure is a reason, and the vault stays closed. Call it once
 * the server holds the home lock, because key generation relies on that lock.
 */
export function openVault(input: OpenVaultInput): OpenVaultResult {
  const vaultPath = NodePath.join(input.stateDir, VAULT_FILE_NAME);

  try {
    const key = resolveMasterKey({
      env: input.env,
      keychain: makeKeyringPort(input.createKeyringEntry, keychainAccountFor(canonical(input.homeDir))),
      store: makeVaultFileKeyStore(vaultPath),
    });

    if (!key.ok) return key;

    return {
      ok: true,
      keyId: key.keyId,
      source: key.source,
      ...makeInMemorySecretVault(Date.now, makeVaultFilePersistence(vaultPath, key.key)),
    };
  } catch {
    return { ok: false, reason: "vault-file-unreadable" };
  }
}
