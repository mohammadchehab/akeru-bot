import * as NodeModule from "node:module";

import type { KeychainPort, KeychainRead } from "./masterKey.ts";
import { MASTER_KEY_BYTES } from "./masterKey.ts";

/** The slice of @napi-rs/keyring's Entry the adapter uses; tests supply a fake. */
export type KeyringEntry = {
  readonly getPassword: () => string | null;
  readonly setPassword: (password: string) => void;
};

export type KeyringEntryFactory = (service: string, account: string) => KeyringEntry;

export const KEYCHAIN_SERVICE = "isnadibot";

/** One master key per Isnadi home, so a dev home never reads or overwrites the real install's key. */
export const keychainAccountFor = (homeDir: string): string => `vault-master-key:${homeDir}`;

const NO_KEYRING_MESSAGE =
  /no (secure )?storage|platform secure storage|not supported|no secret service/i;

const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/**
 * Maps the OS keychain onto KeychainPort. No keyring on the platform is
 * `unavailable`, a missing item is `not-found`, and a locked or denied
 * keychain or any other failure is `error`, which never regenerates a key.
 */
export function makeKeyringPort(
  createEntry: KeyringEntryFactory | undefined,
  account: string,
): KeychainPort {
  if (createEntry === undefined) {
    return { read: () => ({ kind: "unavailable" }), write: () => false };
  }

  const entry = () => createEntry(KEYCHAIN_SERVICE, account);

  return {
    read: (): KeychainRead => {
      try {
        const stored = entry().getPassword();

        if (stored === null) return { kind: "not-found" };

        const key = Buffer.from(stored, "base64");

        return key.length === MASTER_KEY_BYTES ? { kind: "found", key } : { kind: "error" };
      } catch (cause) {
        return NO_KEYRING_MESSAGE.test(messageOf(cause))
          ? { kind: "unavailable" }
          : { kind: "error" };
      }
    },
    write: (key) => {
      try {
        entry().setPassword(key.toString("base64"));

        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Loads the native module lazily; a platform without a prebuilt binary yields no factory, so the vault falls to the next key source. */
export function loadKeyringEntryFactory(): KeyringEntryFactory | undefined {
  try {
    const { Entry } = NodeModule.createRequire(import.meta.url)("@napi-rs/keyring");

    return (service, account) => new Entry(service, account);
  } catch {
    return undefined;
  }
}
