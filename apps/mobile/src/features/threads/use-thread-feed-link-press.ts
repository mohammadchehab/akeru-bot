import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import type { EnvironmentId } from "@isnadi/contracts";
import { isAppDeepLink } from "@isnadi/client-runtime/settings-deep-link";
import { resolveMarkdownLinkPresentation } from "@isnadi/mobile-markdown-text/links";

import { tryOpenExternalUrl } from "../../lib/openExternalUrl";
import { resolveMobileSettingsDestination } from "../settings/settingsDeepLink";

/** Opens a markdown link: app deep links navigate to Settings, other links open externally. */
export function useMarkdownLinkPress(environmentId: EnvironmentId) {
  const navigation = useNavigation();

  const onMarkdownLinkPress = useCallback(
    (href: string) => {
      if (isAppDeepLink(href)) {
        const destination = resolveMobileSettingsDestination(href);

        if (destination === null) return;
        void Haptics.selectionAsync();

        if (destination.kind === "health") {
          navigation.navigate("SettingsSheet", {
            screen: "SettingsContent",
            params: {
              screen: "SettingsProviderHealth",
              params: {
                environmentId: environmentId,
                target: destination.target,
              },
            },
          });
        } else {
          navigation.navigate("SettingsSheet", {
            screen: "SettingsContent",
            params: { screen: destination.kind === "home" ? "Settings" : destination.screen },
          });
        }

        return;
      }

      const presentation = resolveMarkdownLinkPresentation(href);

      // Mobile has no workspace file viewer; file links stay inert.
      if (presentation.kind === "file") return;

      if (presentation.href) {
        void tryOpenExternalUrl(presentation.href, "markdown-link");
      }
    },
    [environmentId, navigation],
  );

  return onMarkdownLinkPress;
}
