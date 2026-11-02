import * as Updates from "expo-updates";
import { DevSettings, I18nManager } from "react-native";

import { defaultFlushPendingWrites } from "../features/updates/app-updates";
import type { LayoutDirection } from "./layoutDirection";

export interface LayoutDirectionRuntime {
  readonly allowRTL: (allow: boolean) => void;
  readonly forceRTL: (force: boolean) => void;
  readonly flush: () => Promise<void>;
  readonly reload: () => Promise<void>;
}

const nativeRuntime: LayoutDirectionRuntime = {
  allowRTL: (allow) => I18nManager.allowRTL(allow),
  forceRTL: (force) => I18nManager.forceRTL(force),
  flush: defaultFlushPendingWrites,
  // expo-updates is not available in a development client, which reloads through the dev menu.
  reload: async () => {
    if (__DEV__) {
      DevSettings.reload();

      return;
    }

    await Updates.reloadAsync();
  },
};

/**
 * React Native reads the layout direction once at startup, so a language with the other direction
 * only takes effect after a reload. Drafts and the outbox are flushed first so the restart loses
 * nothing; a failed flush does not block it, because the reload was asked for.
 */
export async function reloadWithLayoutDirection(
  direction: LayoutDirection,
  runtime: LayoutDirectionRuntime = nativeRuntime,
): Promise<void> {
  // Both flags persist and isRTL is forceRTL || (allowRTL && an RTL device locale), so leaving an
  // RTL language on an RTL-locale device needs allowRTL(false) as well as forceRTL(false).
  runtime.allowRTL(direction === "rtl");
  runtime.forceRTL(direction === "rtl");
  await runtime.flush().catch(() => undefined);
  await runtime.reload();
}
