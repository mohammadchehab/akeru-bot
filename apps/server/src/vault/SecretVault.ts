import { normalizeHttpsOrigin } from "./originBinding.ts";

export type CredentialMetadata = {
  readonly id: string;
  readonly label: string;
  /** Exact https origins the secret may be typed into. */
  readonly origins: ReadonlyArray<string>;
  readonly updatedAt: number;
};

export type SetCredentialInput = {
  readonly id: string;
  readonly label: string;
  readonly origins: ReadonlyArray<string>;
  readonly value: string;
};

export type SetCredentialResult =
  | { readonly ok: true; readonly credential: CredentialMetadata }
  | { readonly ok: false; readonly reason: "no-valid-origin" | "empty-value" | "already-exists" };

/**
 * Write-only admin surface for the user-scope RPC. Nothing here returns a
 * stored value, and `set` never rebinds the origins of an existing credential.
 */
export type SecretVault = {
  readonly set: (input: SetCredentialInput) => SetCredentialResult;
  readonly replaceValue: (id: string, value: string) => boolean;
  readonly delete: (id: string) => boolean;
  readonly list: () => ReadonlyArray<CredentialMetadata>;
  readonly find: (id: string) => CredentialMetadata | undefined;
};

/**
 * Broker-only surface. Only `requestSecret` receives it; the RPC layer never
 * imports it. `consume` returns nothing, so the value cannot be returned out.
 * Resolves false when the credential does not exist.
 */
export type SecretReader = {
  readonly withSecret: (
    id: string,
    consume: (value: string) => void | Promise<void>,
  ) => Promise<boolean>;
};

export type InMemorySecretVault = {
  readonly vault: SecretVault;
  readonly reader: SecretReader;
};

/** Where a vault keeps its entries between runs; `save` gets every entry after each change. */
export type VaultPersistence = {
  readonly initial: ReadonlyArray<{ readonly metadata: CredentialMetadata; readonly value: string }>;
  readonly save: (
    entries: ReadonlyArray<{ readonly metadata: CredentialMetadata; readonly value: string }>,
  ) => void;
};

/**
 * Holds values in memory. Without `persistence` nothing reaches disk; with
 * it, `save` is the only place a value leaves, and the caller seals it there.
 */
export function makeInMemorySecretVault(
  now: () => number = Date.now,
  persistence?: VaultPersistence,
): InMemorySecretVault {
  const values = new Map<string, string>();
  const metadata = new Map<string, CredentialMetadata>();

  for (const entry of persistence?.initial ?? []) {
    values.set(entry.metadata.id, entry.value);
    metadata.set(entry.metadata.id, entry.metadata);
  }

  const persist = () =>
    persistence?.save([...metadata.values()].map((m) => ({ metadata: m, value: values.get(m.id) ?? "" })));

  const vault: SecretVault = {
    set: (input) => {
      if (metadata.has(input.id)) return { ok: false, reason: "already-exists" };

      const origins = [
        ...new Set(
          input.origins
            .map(normalizeHttpsOrigin)
            .filter((origin): origin is string => origin !== null),
        ),
      ];

      if (origins.length === 0) return { ok: false, reason: "no-valid-origin" };

      if (input.value === "") return { ok: false, reason: "empty-value" };

      const credential = { id: input.id, label: input.label, origins, updatedAt: now() };

      values.set(input.id, input.value);
      metadata.set(input.id, credential);
      persist();

      return { ok: true, credential };
    },
    replaceValue: (id, value) => {
      const current = metadata.get(id);

      if (current === undefined || value === "") return false;

      values.set(id, value);
      metadata.set(id, { ...current, updatedAt: now() });
      persist();

      return true;
    },
    delete: (id) => {
      values.delete(id);

      const removed = metadata.delete(id);

      if (removed) persist();

      return removed;
    },
    list: () => [...metadata.values()],
    find: (id) => metadata.get(id),
  };

  const reader: SecretReader = {
    withSecret: async (id, consume) => {
      const value = values.get(id);

      if (value === undefined) return false;

      await consume(value);

      return true;
    },
  };

  return { vault, reader };
}
