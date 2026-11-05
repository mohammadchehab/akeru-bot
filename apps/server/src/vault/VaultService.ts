import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ServerConfig } from "../config.ts";
import { ServerHomeLock } from "../serverHomeLock.ts";
import { loadKeyringEntryFactory } from "./keychainAdapter.ts";
import { capturedMasterKeyEnv, definedEntries } from "./masterKeyEnv.ts";
import { type OpenVaultResult, openVault } from "./openVault.ts";
import type { SecretReader, SecretVault } from "./SecretVault.ts";

export type VaultStatus =
  | { readonly status: "ready"; readonly vault: SecretVault; readonly reader: SecretReader }
  | {
      readonly status: "disabled";
      readonly reason: Extract<OpenVaultResult, { ok: false }>["reason"];
    };

/**
 * The credential vault for this server. `disabled` means no master key source is
 * configured or the key or file could not be trusted; the server runs without credentials.
 */
export class VaultService extends Context.Service<VaultService, VaultStatus>()(
  "isnadibot/vault/VaultService",
) {}

/** Opens the vault once, after the home lock is held; the reason is logged, never the key. */
export const layer = Layer.effect(
  VaultService,
  Effect.gen(function* () {
    yield* ServerHomeLock;

    const config = yield* ServerConfig;

    const opened = openVault({
      homeDir: config.baseDir,
      stateDir: config.stateDir,
      env: definedEntries(capturedMasterKeyEnv),
      createKeyringEntry: loadKeyringEntryFactory(),
    });

    if (opened.ok) {
      yield* Effect.logInfo("Credential vault ready", {
        keyId: opened.keyId,
        source: opened.source,
      });

      return { status: "ready", vault: opened.vault, reader: opened.reader } as const;
    }

    yield* opened.reason === "no-master-key-source"
      ? Effect.logInfo("Credential vault disabled: no master key source")
      : Effect.logWarning("Credential vault disabled", { reason: opened.reason });

    return { status: "disabled", reason: opened.reason } as const;
  }),
);
