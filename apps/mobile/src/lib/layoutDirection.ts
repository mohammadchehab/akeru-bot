import { directionForLocale, resolveLocale } from "@isnadi/client-runtime/i18n";

export type LayoutDirection = "ltr" | "rtl";

/** The layout direction the native views must have for a language preference on this device. */
export function layoutDirectionForPreference(
  preference: string,
  deviceLocales: readonly string[],
): LayoutDirection {
  return directionForLocale(resolveLocale(preference, deviceLocales));
}

export type LayoutDirectionAction = "settled" | "reload" | "refused";

/**
 * What a launch must do so React Native's layout direction (read once at startup) matches the
 * interface language. `forced` is the direction the last reload asked the platform for. If a
 * reload already asked for the wanted direction and the platform still disagrees, the answer is
 * "refused", so a platform that ignores the request never ends in a reload loop.
 */
export function layoutDirectionAction(input: {
  readonly wanted: LayoutDirection;
  readonly nativeIsRTL: boolean;
  readonly forced: LayoutDirection | undefined;
}): LayoutDirectionAction {
  if ((input.wanted === "rtl") === input.nativeIsRTL) return "settled";

  return input.forced === input.wanted ? "refused" : "reload";
}

/** Whether choosing a language flips the native layout direction, which takes a restart. */
export function languageNeedsRestart(input: {
  readonly preference: string;
  readonly deviceLocales: readonly string[];
  readonly nativeIsRTL: boolean;
}): boolean {
  return (
    (layoutDirectionForPreference(input.preference, input.deviceLocales) === "rtl") !==
    input.nativeIsRTL
  );
}
