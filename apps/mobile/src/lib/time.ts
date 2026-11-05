/** The part of the mobile translator `relativeTime` needs, so plain modules can pass it along. */
export interface RelativeTimeTranslator {
  readonly t: (message: "<1m") => string;
  readonly plural: (
    count: number,
    forms: { readonly one: string; readonly other: string },
  ) => string;
}

/**
 * A compact age such as `5m`, `3h`, or `2d`, in the interface language. The units come from the
 * catalog (Hermes has no `Intl.RelativeTimeFormat`), so each language writes its own and Arabic
 * can add every plural category.
 */
export function relativeTime(
  input: string,
  translator: RelativeTimeTranslator,
  now = Date.now(),
): string {
  const timestamp = Date.parse(input);

  if (Number.isNaN(timestamp)) {
    return translator.t("<1m");
  }

  // Anything under a minute renders as "<1m" rather than a live seconds count.
  // The seconds ticker changed width every second and reflowed the surrounding row.
  const deltaSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (deltaSeconds < 60) return translator.t("<1m");

  const deltaMinutes = Math.floor(deltaSeconds / 60);

  if (deltaMinutes < 60) {
    return translator.plural(deltaMinutes, { one: "{count}m", other: "{count}m" });
  }

  const deltaHours = Math.floor(deltaMinutes / 60);

  if (deltaHours < 24) {
    return translator.plural(deltaHours, { one: "{count}h", other: "{count}h" });
  }

  const deltaDays = Math.floor(deltaHours / 24);

  return translator.plural(deltaDays, { one: "{count}d", other: "{count}d" });
}
