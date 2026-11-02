import { useAtomSet } from "@effect/atom-react";
import * as Exit from "effect/Exit";
import { useEffect, useRef } from "react";
import { I18nManager } from "react-native";

import { updateMobilePreferencesAtom } from "../state/preferences";
import { layoutDirectionAction, type LayoutDirection } from "./layoutDirection";

/**
 * Keeps the native layout direction in step with the interface language. When they disagree at
 * launch (the language was changed, or System default followed a device language change) it
 * records the direction it asks for, then reloads once. The record is what stops a platform that
 * ignores the request from reloading forever.
 */
export function useLayoutDirectionSync(input: {
  readonly ready: boolean;
  readonly wanted: LayoutDirection;
  readonly forced: LayoutDirection | undefined;
}) {
  const save = useAtomSet(updateMobilePreferencesAtom, { mode: "promiseExit" });
  const reloading = useRef(false);

  useEffect(() => {
    if (!input.ready || reloading.current) return;

    const action = layoutDirectionAction({
      wanted: input.wanted,
      nativeIsRTL: I18nManager.isRTL,
      forced: input.forced,
    });

    if (action === "settled") {
      if (input.forced !== undefined) void save({ forcedLayoutDirection: undefined });

      return;
    }

    if (action === "refused") return;

    reloading.current = true;
    void save({ forcedLayoutDirection: input.wanted }).then((saved) => {
      // Without the record a reload could repeat, so an unsaved request is dropped.
      // Loaded on demand: the reload touches expo-updates, which only a real reload needs.
      if (Exit.isSuccess(saved)) {
        return import("./layoutDirectionReload").then((module) =>
          module.reloadWithLayoutDirection(input.wanted),
        );
      }

      reloading.current = false;

      return undefined;
    });
  }, [input.ready, input.wanted, input.forced, save]);
}
