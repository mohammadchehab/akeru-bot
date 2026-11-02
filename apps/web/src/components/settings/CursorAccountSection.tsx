import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId } from "@isnadi/contracts";
import { ExternalLinkIcon, LogOutIcon } from "lucide-react";
import * as Predicate from "effect/Predicate";
import { useState } from "react";

import { useI18n } from "../../i18n";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { cursorAccountState } from "./cursorAccount";
import type { ProviderCatalogEntry } from "./providerCatalog";
import { SettingsMessageRow } from "./settingsDetailLayout";
import { SettingsRow, SettingsSection } from "./settingsLayout";

type Pending =
  | { readonly kind: "idle" }
  | { readonly kind: "working" }
  | { readonly kind: "link"; readonly url: string | null }
  | { readonly kind: "failed"; readonly message: string };

/**
 * Cursor signs in through its own CLI on the environment host, so the account row mirrors what the
 * CLI reports. Signing in shows the link the CLI printed; the environment may be another machine.
 */
export function CursorAccountSection({
  environmentId,
  entry,
}: {
  readonly environmentId: EnvironmentId;
  readonly entry: ProviderCatalogEntry;
}) {
  const { t } = useI18n();

  const providers =
    useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? EMPTY_SERVER_PROVIDERS;

  // The environment has one Cursor instance; prefer the enabled one if settings ever hold more.
  const provider =
    providers.find((candidate) => candidate.driver === entry.drivers[0] && candidate.enabled) ??
    providers.find((candidate) => candidate.driver === entry.drivers[0]);

  const state = cursorAccountState(provider);
  const login = useAtomCommand(serverEnvironment.cursorLogin, { reportFailure: false });
  const logout = useAtomCommand(serverEnvironment.cursorLogout, { reportFailure: false });
  const [pending, setPending] = useState<Pending>({ kind: "idle" });

  const run = async (action: "login" | "logout") => {
    if (provider === undefined) return;

    setPending({ kind: "working" });

    const input = { environmentId, input: { instanceId: provider.instanceId } };

    if (action === "login") {
      const result = await login(input);

      setPending(
        Predicate.isTagged(result, "Success")
          ? { kind: "link", url: result.value.loginUrl }
          : { kind: "failed", message: t("Could not start Cursor sign-in.") },
      );

      return;
    }

    const result = await logout(input);

    setPending(
      Predicate.isTagged(result, "Success")
        ? { kind: "idle" }
        : { kind: "failed", message: t("Could not sign out of Cursor.") },
    );
  };

  const working = pending.kind === "working";

  return (
    <SettingsSection title={t("Account")}>
      {state.kind === "checking" ? (
        <SettingsMessageRow>{t("Checking Cursor…")}</SettingsMessageRow>
      ) : null}
      {state.kind === "not-installed" ? (
        <SettingsRow
          title={t("Cursor CLI not found")}
          description={t(
            "Install the Cursor CLI (`agent`) on the machine that runs this environment.",
          )}
        />
      ) : null}
      {state.kind === "signed-in" ? (
        <SettingsRow
          title={t("Signed in")}
          description={state.email ?? t("Signed in through the Cursor CLI.")}
          control={
            <Button
              size="sm"
              variant="outline"
              disabled={working}
              onClick={() => void run("logout")}
            >
              <LogOutIcon className="size-3.5" />
              {t("Sign out")}
            </Button>
          }
        />
      ) : null}
      {state.kind === "signed-out" ? (
        <SettingsRow
          title={t("Sign in")}
          description={t(
            "Sign in with your Cursor account. Cursor bills your own Cursor plan; IsnadiBot stores no Cursor credential.",
          )}
          control={
            <Button size="sm" disabled={working} onClick={() => void run("login")}>
              {t("Sign in with Cursor")}
            </Button>
          }
        />
      ) : null}
      {state.kind === "signed-out" && pending.kind === "link" ? (
        pending.url === null ? (
          <SettingsMessageRow>
            {t("Run `agent login` on the machine that runs this environment, then refresh.")}
          </SettingsMessageRow>
        ) : (
          <SettingsRow
            title={t("Finish signing in")}
            description={t(
              "Open the sign-in page on this device. This page updates once Cursor confirms.",
            )}
            control={
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(pending.url ?? "", "_blank", "noopener,noreferrer")}
              >
                <ExternalLinkIcon className="size-3.5" />
                {t("Open sign-in page")}
              </Button>
            }
          />
        )
      ) : null}
      {pending.kind === "failed" ? (
        <SettingsMessageRow>{pending.message}</SettingsMessageRow>
      ) : null}
    </SettingsSection>
  );
}
