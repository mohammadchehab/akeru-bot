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
  | { readonly ok: false; readonly reason: "no-valid-origin" | "empty-value" };

/**
 * Write-only credential storage. Nothing here returns a stored value: callers
 * can set, replace, delete, list metadata, or hand `withSecret` a function
 * that consumes the value. Only the request_secret broker calls `withSecret`.
 */
export type SecretVault = {
  readonly set: (input: SetCredentialInput) => SetCredentialResult;
  readonly replaceValue: (id: string, value: string) => boolean;
  readonly delete: (id: string) => boolean;
  readonly list: () => ReadonlyArray<CredentialMetadata>;
  readonly find: (id: string) => CredentialMetadata | undefined;
  readonly withSecret: <A>(id: string, consume: (value: string) => A) => A | undefined;
};

/**
 * Holds values in memory only. Nothing is persisted yet, so no plaintext
 * password reaches disk; persistence arrives with the master key service.
 */
export function makeInMemorySecretVault(now: () => number = Date.now): SecretVault {
  const values = new Map<string, string>();
  const metadata = new Map<string, CredentialMetadata>();

  return {
    set: (input) => {
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
      return { ok: true, credential };
    },
    replaceValue: (id, value) => {
      const current = metadata.get(id);
      if (current === undefined || value === "") return false;
      values.set(id, value);
      metadata.set(id, { ...current, updatedAt: now() });
      return true;
    },
    delete: (id) => {
      values.delete(id);
      return metadata.delete(id);
    },
    list: () => [...metadata.values()],
    find: (id) => metadata.get(id),
    withSecret: (id, consume) => {
      const value = values.get(id);
      return value === undefined ? undefined : consume(value);
    },
  };
}
