import { formattingLocale } from "@isnadi/client-runtime/i18n";
import {
  formatCount,
  formatDateTimeShort,
  formatDayShort,
  formatHourShort,
  formatPercent,
  formatRelativeHourShort,
  formatTokens,
  formatUsd,
} from "@isnadi/shared/usageFormat";
import { useMemo } from "react";

import { useI18n } from "../../i18n";

/**
 * The usage formatters bound to the interface language. Each takes one value, so one can be
 * handed straight to a chart as a tick formatter without the tick index becoming a locale.
 */
export function useUsageFormat() {
  const { locale } = useI18n();

  return useMemo(() => {
    const formatting = formattingLocale(locale);

    return {
      usd: (value: number) => formatUsd(value, formatting),
      count: (value: number) => formatCount(value, formatting),
      tokens: (value: number) => formatTokens(value, formatting),
      percent: (share: number) => formatPercent(share, 1, formatting),
      dayShort: (day: string) => formatDayShort(day, formatting),
      hourShort: (hourStart: string, timeZone?: string) =>
        formatHourShort(hourStart, timeZone, formatting),
      dateTimeShort: (instant: string, timeZone?: string) =>
        formatDateTimeShort(instant, timeZone, formatting),
      relativeHourShort: (hourStart: string, relativeTo: string, timeZone?: string) =>
        formatRelativeHourShort(hourStart, relativeTo, timeZone, formatting),
    };
  }, [locale]);
}
