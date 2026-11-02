import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
/**
 * Display formatting for the usage page.
 *
 * @module usageFormat
 */
import {
  UsageDay,
  type ThreadTokenUsageSnapshot,
  type UsageResolution,
  type UsageSummaryInput,
  type UsageTokenTotals,
} from "@isnadi/contracts";

/** English is the default so a caller without a locale renders exactly as before. */
const DEFAULT_LOCALE = "en-US";

function cached<Options extends object, Formatter>(
  create: (locale: string, options: Options) => Formatter,
) {
  const formatters = new Map<string, Formatter>();

  return (locale: string, options: Options): Formatter => {
    const key = JSON.stringify([locale, options]);
    const existing = formatters.get(key);

    if (existing) return existing;
    const formatter = create(locale, options);

    formatters.set(key, formatter);

    return formatter;
  };
}

const numberFormat = cached(
  (locale: string, options: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options),
);

const dateFormat = cached(
  (locale: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options),
);

/**
 * Every formatter takes the locale as its last argument. Pass the interface language through
 * `formattingLocale` so Arabic gets Western digits and the Gregorian calendar.
 */
export function formatUsd(value: number, locale = DEFAULT_LOCALE): string {
  return numberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCount(value: number, locale = DEFAULT_LOCALE): string {
  return numberFormat(locale, {}).format(Math.round(value));
}

/**
 * Compacts a token count to three significant figures with a unit suffix, so
 * columns of numbers line up at a glance (`19.9B`, `76.7M`, `804K`).
 */
export function formatTokens(value: number, locale = DEFAULT_LOCALE): string {
  const abs = Math.abs(value);

  if (abs >= 1e12) return `${trim(value / 1e12, locale)}T`;

  if (abs >= 1e9) return `${trim(value / 1e9, locale)}B`;

  if (abs >= 1e6) return `${trim(value / 1e6, locale)}M`;

  if (abs >= 1e3) return `${trim(value / 1e3, locale)}K`;

  return formatCount(value, locale);
}

export function stepTokenCount(usage: ThreadTokenUsageSnapshot): number | null {
  if (usage.lastInputTokens !== undefined || usage.lastOutputTokens !== undefined) {
    return (usage.lastInputTokens ?? 0) + (usage.lastOutputTokens ?? 0);
  }

  return usage.lastUsedTokens ?? null;
}

export function stepUsageTokenTotals(usage: ThreadTokenUsageSnapshot): UsageTokenTotals {
  const inputTokens = usage.lastInputTokens ?? 0;
  const cachedInputTokens = Math.min(inputTokens, usage.lastCachedInputTokens ?? 0);
  const outputTokens = usage.lastOutputTokens ?? 0;

  return {
    uncachedInputTokens: Math.max(0, inputTokens - cachedInputTokens),
    cachedInputTokens,
    cacheCreationTokens: 0,
    outputTokens,
    reasoningTokens: Math.min(outputTokens, usage.lastReasoningOutputTokens ?? 0),
  };
}

function trim(value: number, locale: string): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;

  // Zero fraction digits are dropped (`20K`, not `20.0K`), as `toFixed` plus a trim did.
  return numberFormat(locale, {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value.toFixed(digits)));
}

export function formatPercent(share: number, digits = 1, locale = DEFAULT_LOCALE): string {
  return numberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(share);
}

/** `2026-08-07` to `Aug 7`. */
export function formatDayShort(day: string, locale = DEFAULT_LOCALE): string {
  const [year, month, dayOfMonth] = day.split("-").map((part) => Number(part));

  if (year === undefined || month === undefined || dayOfMonth === undefined) return day;

  // The day is a calendar date, so it is formatted as UTC to avoid the host zone shifting it.
  return dateFormat(locale, { timeZone: "UTC", month: "short", day: "numeric" }).format(
    Date.UTC(year, month - 1, dayOfMonth),
  );
}

/** Inclusive day list between two `YYYY-MM-DD` bounds. */
export function enumerateDays(sinceDay: string, untilDay: string): readonly string[] {
  const days: string[] = [];
  const start = Date.parse(`${sinceDay}T00:00:00Z`);
  const end = Date.parse(`${untilDay}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return days;

  for (let cursor = start; cursor <= end; cursor += 86_400_000) {
    days.push(DateTime.formatIso(DateTime.makeUnsafe(cursor)).slice(0, 10));
  }

  return days;
}

const HOUR_MS = 60 * 60 * 1000;

/** Every fixed-duration bucket start in an hourly rolling window. */
export function enumerateHourStarts(sinceTime: string, untilTime: string): readonly string[] {
  const starts: string[] = [];
  const start = Date.parse(sinceTime);
  const end = Date.parse(untilTime);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return starts;

  for (let cursor = start; cursor < end; cursor += HOUR_MS) {
    starts.push(DateTime.formatIso(DateTime.makeUnsafe(cursor)));
  }

  return starts;
}

/**
 * A rolling bucket start rendered in the viewer's requested time zone.
 *
 * Repeated wall-clock hours during a fall-back transition include their short
 * zone name so the two distinct buckets remain distinguishable.
 */
export function formatHourShort(
  hourStart: string,
  timeZone?: string,
  locale = DEFAULT_LOCALE,
): string {
  const parsed = DateTime.make(Date.parse(hourStart));

  if (Option.isNone(parsed)) return hourStart;
  const instant = DateTime.toEpochMillis(parsed.value);
  const options = timeZone === undefined ? {} : { timeZone };

  const hourFormat = dateFormat(locale, {
    ...options,
    hour: "numeric",
  });

  // A machine-readable wall hour used only to spot repeated hours, never shown.
  const wallHourFormat = dateFormat("en-CA", {
    ...options,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const wallHour = wallHourFormat.format(instant);

  const isRepeatedHour = [-HOUR_MS, HOUR_MS].some(
    (offset) => wallHourFormat.format(instant + offset) === wallHour,
  );

  if (!isRepeatedHour) return hourFormat.format(instant);

  return dateFormat(locale, {
    ...(timeZone === undefined ? {} : { timeZone }),
    hour: "numeric",
    timeZoneName: "short",
  }).format(instant);
}

/** `2026-08-11T14:37:00Z` to `Aug 11, 2 PM` in the requested zone. */
export function formatDateTimeShort(
  instant: string,
  timeZone?: string,
  locale = DEFAULT_LOCALE,
): string {
  const date = DateTime.make(Date.parse(instant));

  if (Option.isNone(date)) return instant;

  return dateFormat(locale, {
    ...(timeZone === undefined ? {} : { timeZone }),
    month: "short",
    day: "numeric",
    hour: "numeric",
  }).format(DateTime.toEpochMillis(date.value));
}

/**
 * An hourly tooltip label relative to the rolling window's end date. Web only: it uses
 * `Intl.RelativeTimeFormat`, which Hermes does not have, so mobile must not call it.
 */
export function formatRelativeHourShort(
  hourStart: string,
  relativeTo: string,
  timeZone?: string,
  locale = DEFAULT_LOCALE,
): string {
  const instant = DateTime.make(Date.parse(hourStart));
  const reference = DateTime.make(Date.parse(relativeTo));

  if (Option.isNone(instant) || Option.isNone(reference)) {
    return formatDateTimeShort(hourStart, timeZone, locale);
  }

  const dayFormat = dateFormat("en-CA", {
    ...(timeZone === undefined ? {} : { timeZone }),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const instantDay = Date.parse(
    `${dayFormat.format(DateTime.toEpochMillis(instant.value))}T00:00:00Z`,
  );

  const referenceDay = Date.parse(
    `${dayFormat.format(DateTime.toEpochMillis(reference.value))}T00:00:00Z`,
  );

  const calendarDaysAgo = Math.round((referenceDay - instantDay) / (24 * HOUR_MS));
  const hour = formatHourShort(hourStart, timeZone, locale);

  if (calendarDaysAgo === 0 || calendarDaysAgo === 1) {
    // "today" and "yesterday" in the interface language; in English this is "2 PM today".
    const day = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -calendarDaysAgo,
      "day",
    );

    return `${hour} ${day}`;
  }

  return formatDateTimeShort(hourStart, timeZone, locale);
}

/**
 * The window the page requests, expressed in the viewer's own time zone so days
 * line up with what they actually experienced.
 */
export function makeWindow(
  days: number,
  now = DateTime.toDateUtc(DateTime.nowUnsafe()),
  resolution: UsageResolution = "day",
): UsageSummaryInput {
  let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  let format: Intl.DateTimeFormat;

  try {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    // An unknown zone should degrade to UTC rather than crash the page.
    timeZone = "UTC";
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const untilDay = format.format(now);

  if (resolution === "hour") {
    // Minute-aligned bounds keep labels readable while still representing an
    // exact rolling 24-hour duration. Fixed-duration buckets remain correct
    // across offset changes and daylight-saving transitions.
    const untilTimeMs = Math.floor(now.getTime() / 60_000) * 60_000;
    const sinceTimeMs = untilTimeMs - 24 * HOUR_MS;
    const sinceTime = DateTime.makeUnsafe(sinceTimeMs);
    const untilTime = DateTime.makeUnsafe(untilTimeMs);

    return {
      sinceDay: UsageDay.make(format.format(sinceTimeMs)),
      untilDay: UsageDay.make(format.format(untilTimeMs)),
      timeZone,
      resolution,
      sinceTime: DateTime.formatIso(sinceTime),
      untilTime: DateTime.formatIso(untilTime),
    };
  }

  // Subtracting fixed milliseconds from `now` lands on the wrong calendar day
  // around a DST transition. The window start is pure calendar arithmetic on
  // the local end day, done in UTC where days are uniform.
  const [year = 0, month = 1, dayOfMonth = 1] = untilDay
    .split("-")
    .map((part) => Number.parseInt(part, 10));

  const start = DateTime.makeUnsafe(Date.UTC(year, month - 1, dayOfMonth - (days - 1)));

  return {
    sinceDay: UsageDay.make(DateTime.formatIso(start).slice(0, 10)),
    untilDay: UsageDay.make(untilDay),
    timeZone,
    resolution,
  };
}
