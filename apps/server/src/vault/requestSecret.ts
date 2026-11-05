import { checkInjectionTarget, type InjectionTarget } from "./originBinding.ts";
import type { SecretVault } from "./SecretVault.ts";

/** What the broker needs from the browser. `inspect` reports the live frame URLs. */
export type SecretFieldBrowser = {
  readonly inspect: (field: string) => Promise<InjectionTarget>;
  readonly fill: (field: string, value: string) => Promise<void>;
  readonly clear: (field: string) => Promise<void>;
};

/** One row per use, shown to the user. Never carries the value. */
export type SecretUseRecord = {
  readonly credentialId: string;
  readonly label: string;
  readonly botId: string;
  readonly origin: string | null;
  readonly outcome: "filled" | "refused" | "redirected";
  readonly at: number;
};

export type SecretUseAudit = {
  readonly record: (entry: SecretUseRecord) => void;
  readonly list: () => ReadonlyArray<SecretUseRecord>;
};

export function makeInMemorySecretUseAudit(): SecretUseAudit {
  const entries: Array<SecretUseRecord> = [];
  return { record: (entry) => entries.push(entry), list: () => [...entries] };
}

export type RequestSecretResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | "unknown-credential"
        | "top-frame-not-https"
        | "origin-not-bound"
        | "field-not-in-top-frame"
        | "redirected-during-fill";
    };

/**
 * Types a stored secret into one field, only when the top frame is on a bound
 * origin. The origin is checked right before the fill and again after it, so a
 * redirect that lands mid-fill is caught and the field is cleared. The result
 * names a reason, never the value.
 */
export async function requestSecret(
  deps: {
    readonly vault: SecretVault;
    readonly browser: SecretFieldBrowser;
    readonly audit: SecretUseAudit;
    readonly now?: () => number;
  },
  input: { readonly credentialId: string; readonly botId: string; readonly field: string },
): Promise<RequestSecretResult> {
  const now = deps.now ?? Date.now;
  const credential = deps.vault.find(input.credentialId);
  if (credential === undefined) return { ok: false, reason: "unknown-credential" };

  const log = (outcome: SecretUseRecord["outcome"], origin: string | null) =>
    deps.audit.record({
      credentialId: credential.id,
      label: credential.label,
      botId: input.botId,
      origin,
      outcome,
      at: now(),
    });

  const before = checkInjectionTarget(credential.origins, await deps.browser.inspect(input.field));
  if (!before.allowed) {
    log("refused", null);
    return { ok: false, reason: before.reason };
  }

  await deps.vault.withSecret(input.credentialId, (value) =>
    deps.browser.fill(input.field, value),
  );

  const after = checkInjectionTarget(credential.origins, await deps.browser.inspect(input.field));
  if (!after.allowed || after.origin !== before.origin) {
    await deps.browser.clear(input.field);
    log("redirected", before.origin);
    return { ok: false, reason: "redirected-during-fill" };
  }

  log("filled", before.origin);
  return { ok: true };
}
