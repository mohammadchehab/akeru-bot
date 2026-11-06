import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import * as Predicate from "effect/Predicate";

import type { MasterKeyStore, ScryptParams } from "./masterKey.ts";
import { openValue, sealValue } from "./sealedRecord.ts";
import type { CredentialMetadata, VaultPersistence } from "./SecretVault.ts";

type StoredCredential = CredentialMetadata & { readonly sealed: string };

type StoredVault = {
  readonly version: 1;
  readonly kdf?: {
    readonly salt: string;
    readonly N: number;
    readonly r: number;
    readonly p: number;
  };
  readonly keyCheck?: string;
  readonly credentials: ReadonlyArray<StoredCredential>;
};

const EMPTY: StoredVault = { version: 1, credentials: [] };

function read(filePath: string): StoredVault {
  let raw: string;

  try {
    raw = NodeFS.readFileSync(filePath, "utf8");
  } catch (cause) {
    if (Predicate.hasProperty(cause, "code") && cause.code === "ENOENT") return EMPTY;

    throw cause;
  }

  const parsed: StoredVault = JSON.parse(raw);

  if (parsed.version !== 1 || !Array.isArray(parsed.credentials)) {
    throw new Error("vault file has an unknown format");
  }

  return parsed;
}

/** Temp file then rename, owner-only, so a crash never leaves a half-written vault. */
function write(filePath: string, vault: StoredVault): void {
  NodeFS.mkdirSync(NodePath.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.${process.pid}.tmp`;

  NodeFS.writeFileSync(tempPath, JSON.stringify(vault), { mode: 0o600 });
  NodeFS.renameSync(tempPath, filePath);
}

/** The non-secret half of the vault file: salt and params, key check, and how many sealed records exist. */
export const VAULT_FILE_NAME = "vault.json";

/** Where the sealed vault file lives inside a state directory. */
export function vaultFilePath(stateDir: string): string {
  return NodePath.join(stateDir, VAULT_FILE_NAME);
}

/** The real path of an Isnadi home when it exists, else its absolute form; names the keychain item. */
export function canonicalHomeDir(dir: string): string {
  try {
    return NodeFS.realpathSync(dir);
  } catch {
    return NodePath.resolve(dir);
  }
}

export function createVaultFileKeyStore(filePath: string): MasterKeyStore {
  const update = (patch: Partial<StoredVault>) => write(filePath, { ...read(filePath), ...patch });

  return {
    readKdf: () => {
      const kdf = read(filePath).kdf;

      return kdf === undefined
        ? undefined
        : ({ ...kdf, salt: Buffer.from(kdf.salt, "base64") } satisfies ScryptParams);
    },
    writeKdf: (params) => update({ kdf: { ...params, salt: params.salt.toString("base64") } }),
    readKeyCheck: () => read(filePath).keyCheck,
    writeKeyCheck: (keyCheck) => update({ keyCheck }),
    sealedRecordCount: () => read(filePath).credentials.length,
  };
}

/**
 * Persists credentials in the vault file, each value sealed with the master
 * key. A record that does not open is dropped from memory but kept on disk
 * untouched until the credential is deleted or replaced.
 */
export function createVaultFilePersistence(filePath: string, key: Buffer): VaultPersistence {
  const stored = read(filePath);

  const initial = stored.credentials.flatMap(({ sealed, ...metadata }) => {
    const value = openValue(key, metadata.id, sealed);

    return value === undefined ? [] : [{ metadata, value }];
  });

  return {
    initial,
    save: (entries) =>
      write(filePath, {
        ...read(filePath),
        credentials: entries.map(({ metadata, value }) => ({
          ...metadata,
          sealed: sealValue(key, metadata.id, value),
        })),
      }),
  };
}
