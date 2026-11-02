import type { ServerProvider } from "@isnadi/contracts";

export type CursorAccountState =
  | { readonly kind: "checking" }
  | { readonly kind: "not-installed" }
  | { readonly kind: "signed-out" }
  | { readonly kind: "signed-in"; readonly email: string | null };

/** What the Cursor CLI on the environment host reports, reduced to what the account row shows. */
export function cursorAccountState(provider: ServerProvider | undefined): CursorAccountState {
  if (provider === undefined) return { kind: "checking" };

  if (!provider.installed) return { kind: "not-installed" };

  if (provider.auth.status === "authenticated") {
    return { kind: "signed-in", email: provider.auth.email ?? null };
  }

  return { kind: "signed-out" };
}
