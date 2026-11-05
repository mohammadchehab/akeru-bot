import { checkInjectionTarget, normalizeHttpsOrigin, type InjectionTarget } from "./originBinding.ts";
import type { SecretReader, SecretVault } from "./SecretVault.ts";

/**
 * What the broker needs from the browser. `inspect` reports the live frames and
 * a document identity. `fill` must throw when the live document is not
 * `target.documentId` (the adapter enforces it in the same in-page task that
 * writes, for example DOM.focus plus Input.insertText on the checked frame's
 * execution context). Its errors must never echo the value.
 */
export type SecretFieldBrowser = {
  readonly inspect: (field: string) => Promise<InjectionTarget>;
  readonly fill: (field: string, value: string, target: InjectionTarget) => Promise<void>;
  readonly clear: (field: string) => Promise<void>;
};

/** One row per use, shown to the user. Never carries the value. */
export type SecretUseRecord = {
  readonly credentialId: string;
  readonly label: string;
  readonly botId: string;
  /** The top-frame origin that was attempted (never a path), or null when it is not https. */
  readonly origin: string | null;
  readonly outcome: "filled" | "refused" | "redirected" | "failed";
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
        | "redirected-during-fill"
        | "fill-failed";
    };

/**
 * Types a stored secret into one field, only when the top frame is on a bound
 * origin. The fill is bound to the document that was checked, and the origin
 * is checked again afterwards as a second line of defence: a redirect that
 * lands mid-fill clears the field. The result names a reason, never the value.
 */
export async function requestSecret(
  deps: {
    readonly vault: Pick<SecretVault, "find">;
    readonly reader: SecretReader;
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

  const target = await deps.browser.inspect(input.field);
  const before = checkInjectionTarget(credential.origins, target);

  if (!before.allowed) {
    log("refused", normalizeHttpsOrigin(target.topFrameUrl));
    return { ok: false, reason: before.reason };
  }

  let found: boolean;

  try {
    found = await deps.reader.withSecret(input.credentialId, (value) =>
      deps.browser.fill(input.field, value, target),
    );
  } catch {
    await deps.browser.clear(input.field).catch(() => undefined);
    log("failed", before.origin);
    return { ok: false, reason: "fill-failed" };
  }

  if (!found) return { ok: false, reason: "unknown-credential" };

  const next = await deps.browser.inspect(input.field);
  const after = checkInjectionTarget(credential.origins, next);

  if (!after.allowed || after.origin !== before.origin || next.documentId !== target.documentId) {
    await deps.browser.clear(input.field);
    log("redirected", before.origin);
    return { ok: false, reason: "redirected-during-fill" };
  }

  log("filled", before.origin);

  return { ok: true };
}
