import * as NodeCrypto from "node:crypto";

export const MASTER_KEY_BYTES = 32;

const KEY_CHECK_PLAINTEXT = "isnadibot-vault-key-check-v1";

export type MasterKeySource = "env" | "keychain" | "passphrase";

export type MasterKeyFailure =
  | "no-master-key-source"
  | "invalid-env-key"
  | "keychain-error"
  | "keychain-key-missing"
  | "wrong-key";

export type MasterKeyResult =
  | {
      readonly ok: true;
      readonly key: Buffer;
      readonly keyId: string;
      readonly source: MasterKeySource;
    }
  | { readonly ok: false; readonly reason: MasterKeyFailure };

/** Answer of the OS keychain. `unavailable` means this machine has none; anything else wrong is `error`. */
export type KeychainRead =
  | { readonly kind: "found"; readonly key: Buffer }
  | { readonly kind: "not-found" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "error" };

export type KeychainPort = {
  readonly read: () => KeychainRead;
  /** Returns false when the keychain refused the write. */
  readonly write: (key: Buffer) => boolean;
};

/** Not secret: the salt and the key-check record live in the home, the key never does. */
export type MasterKeyStore = {
  readonly readSalt: () => Buffer | undefined;
  readonly writeSalt: (salt: Buffer) => void;
  readonly readKeyCheck: () => string | undefined;
  readonly writeKeyCheck: (record: string) => void;
  /** How many sealed credentials the vault holds; decides whether a missing key may be regenerated. */
  readonly sealedRecordCount: () => number;
};

export type MasterKeyInputs = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly keychain: KeychainPort;
  readonly store: MasterKeyStore;
};

const fail = (reason: MasterKeyFailure): MasterKeyResult => ({ ok: false, reason });

export const keyIdOf = (key: Buffer): string =>
  NodeCrypto.createHash("sha256").update(key).digest("hex").slice(0, 16);

/** AES-256-GCM of a constant, plus the key id, so a wrong key is caught before any record is touched. */
export function sealKeyCheck(key: Buffer): string {
  const iv = NodeCrypto.randomBytes(12);
  const cipher = NodeCrypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(KEY_CHECK_PLAINTEXT, "utf8"), cipher.final()]);

  return [
    keyIdOf(key),
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    body.toString("base64"),
  ].join(".");
}

export function verifyKeyCheck(key: Buffer, record: string): boolean {
  const [keyId, iv, tag, body] = record.split(".");

  if (keyId !== keyIdOf(key) || iv === undefined || tag === undefined || body === undefined) {
    return false;
  }

  try {
    const decipher = NodeCrypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));

    decipher.setAuthTag(Buffer.from(tag, "base64"));

    const plain = Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]);

    return plain.toString("utf8") === KEY_CHECK_PLAINTEXT;
  } catch {
    return false;
  }
}

type Candidate =
  | { readonly kind: "key"; readonly key: Buffer; readonly source: MasterKeySource }
  | { readonly kind: "skip" }
  | { readonly kind: "failed"; readonly reason: MasterKeyFailure };

function fromEnv(env: MasterKeyInputs["env"]): Candidate {
  const raw = env.ISNADI_MASTER_KEY;

  if (raw === undefined || raw === "") return { kind: "skip" };

  const key = Buffer.from(raw, "base64");

  // A set-but-broken env key is a misconfiguration, never a reason to fall through to another key.
  if (key.length !== MASTER_KEY_BYTES) return { kind: "failed", reason: "invalid-env-key" };

  return { kind: "key", key, source: "env" };
}

function fromKeychain({ keychain, store }: MasterKeyInputs): Candidate {
  const answer = keychain.read();

  if (answer.kind === "unavailable") return { kind: "skip" };

  if (answer.kind === "error") return { kind: "failed", reason: "keychain-error" };

  if (answer.kind === "found") return { kind: "key", key: answer.key, source: "keychain" };

  // Fail closed: a fresh key beside sealed records, or a key-check from an earlier key, would orphan them.
  if (store.sealedRecordCount() > 0 || store.readKeyCheck() !== undefined)
    return { kind: "failed", reason: "keychain-key-missing" };

  const key = NodeCrypto.randomBytes(MASTER_KEY_BYTES);

  if (!keychain.write(key)) return { kind: "failed", reason: "keychain-error" };

  return { kind: "key", key, source: "keychain" };
}

function fromPassphrase(env: MasterKeyInputs["env"], store: MasterKeyStore): Candidate {
  const passphrase = env.ISNADI_MASTER_PASSPHRASE;

  if (passphrase === undefined || passphrase === "") return { kind: "skip" };

  const existing = store.readSalt();
  const salt = existing ?? NodeCrypto.randomBytes(16);

  if (existing === undefined) store.writeSalt(salt);

  return {
    kind: "key",
    key: NodeCrypto.scryptSync(passphrase, salt, MASTER_KEY_BYTES),
    source: "passphrase",
  };
}

/**
 * Resolves the vault master key. First source that answers wins: the
 * ISNADI_MASTER_KEY env var, the OS keychain, then ISNADI_MASTER_PASSPHRASE.
 * No key is ever written to the home. The caller holds the home lock, so
 * generating a key cannot race a second server.
 */
export function resolveMasterKey(inputs: MasterKeyInputs): MasterKeyResult {
  const { env, store } = inputs;
  const chain = [() => fromEnv(env), () => fromKeychain(inputs), () => fromPassphrase(env, store)];

  for (const next of chain) {
    const candidate = next();

    if (candidate.kind === "skip") continue;

    if (candidate.kind === "failed") return fail(candidate.reason);

    const record = store.readKeyCheck();

    if (record !== undefined && !verifyKeyCheck(candidate.key, record)) return fail("wrong-key");

    if (record === undefined) store.writeKeyCheck(sealKeyCheck(candidate.key));

    return {
      ok: true,
      key: candidate.key,
      keyId: keyIdOf(candidate.key),
      source: candidate.source,
    };
  }

  return fail("no-master-key-source");
}
