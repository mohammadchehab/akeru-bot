import { describe, expect, it, vi } from "vite-plus/test";

import {
  enumerateDays,
  enumerateHourStarts,
  formatCount,
  formatDateTimeShort,
  formatDayShort,
  formatHourShort,
  formatPercent,
  formatRelativeHourShort,
  formatTokens,
  formatUsd,
  makeWindow,
  stepTokenCount,
  stepUsageTokenTotals,
} from "./usageFormat.ts";

describe("step usage", () => {
  it("accounts for per-step tokens without using context occupancy", () => {
    const usage = {
      usedTokens: 90_000,
      lastUsedTokens: 90_000,
      lastInputTokens: 1_200,
      lastCachedInputTokens: 200,
      lastOutputTokens: 300,
      lastReasoningOutputTokens: 100,
    };

    expect(stepTokenCount(usage)).toBe(1_500);
    expect(stepUsageTokenTotals(usage)).toEqual({
      uncachedInputTokens: 1_000,
      cachedInputTokens: 200,
      cacheCreationTokens: 0,
      outputTokens: 300,
      reasoningTokens: 100,
    });
    expect(stepTokenCount({ usedTokens: 90_000 })).toBeNull();
  });
});

describe("hourly usage formatting", () => {
  it("enumerates 24 fixed buckets across a rolling window", () => {
    const hours = enumerateHourStarts("2026-08-10T12:37:00.000Z", "2026-08-11T12:37:00.000Z");

    expect(hours).toHaveLength(24);
    expect(hours[0]).toBe("2026-08-10T12:37:00.000Z");
    expect(hours[23]).toBe("2026-08-11T11:37:00.000Z");
  });

  it("formats rolling instants in the requested time zone", () => {
    expect(formatHourShort("2026-08-11T00:37:00.000Z", "UTC")).toBe("12 AM");
    expect(formatHourShort("2026-08-11T12:37:00.000Z", "UTC")).toBe("12 PM");
    expect(formatDateTimeShort("2026-08-11T17:37:00.000Z", "UTC")).toBe("Aug 11, 5 PM");
  });

  it("disambiguates repeated hours during a fall-back transition", () => {
    expect(formatHourShort("2026-11-01T05:37:00.000Z", "America/New_York")).toBe("1 AM EDT");
    expect(formatHourShort("2026-11-01T06:37:00.000Z", "America/New_York")).toBe("1 AM EST");
  });

  it("makes hourly tooltip dates relative to the window in its requested time zone", () => {
    const windowEnd = "2026-08-11T14:37:00.000Z";

    expect(formatRelativeHourShort("2026-08-10T17:37:00.000Z", windowEnd, "UTC")).toBe(
      "5 PM yesterday",
    );
    expect(formatRelativeHourShort("2026-08-11T14:37:00.000Z", windowEnd, "UTC")).toBe(
      "2 PM today",
    );
    expect(
      formatRelativeHourShort(
        "2026-08-11T01:37:00.000Z",
        "2026-08-11T10:37:00.000Z",
        "America/Los_Angeles",
      ),
    ).toBe("6 PM yesterday");
  });

  it("builds an exact minute-aligned 24-hour request", () => {
    const window = makeWindow(1, new Date("2026-08-11T12:37:42.123Z"), "hour");

    expect(window.resolution).toBe("hour");
    expect(window.sinceTime).toBe("2026-08-10T12:37:00.000Z");
    expect(window.untilTime).toBe("2026-08-11T12:37:00.000Z");
  });

  it("degrades an unknown resolved zone to UTC instead of crashing", () => {
    const resolved = new Intl.DateTimeFormat().resolvedOptions();

    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ ...resolved, timeZone: "Etc/Unknown" });

    try {
      const now = new Date("2026-08-11T12:37:42.123Z");

      expect(makeWindow(1, now, "hour").timeZone).toBe("UTC");
      expect(makeWindow(30, now).timeZone).toBe("UTC");
    } finally {
      resolvedOptions.mockRestore();
    }
  });
});

describe("usage date compatibility", () => {
  it("keeps invalid dates and reversed windows harmless", () => {
    expect(enumerateDays("invalid", "2026-08-11")).toEqual([]);
    expect(enumerateDays("2026-08-11", "2026-08-10")).toEqual([]);
    expect(enumerateHourStarts("invalid", "2026-08-11")).toEqual([]);
    expect(formatHourShort("invalid", "UTC")).toBe("invalid");
    expect(formatDateTimeShort("invalid", "UTC")).toBe("invalid");
    expect(formatRelativeHourShort("invalid", "2026-08-11", "UTC")).toBe("invalid");
  });

  it("keeps unzoned timestamps in the viewer's local zone", () => {
    const value = "2026-08-11T12:37:00";
    const zoned = new Date(value).toISOString();
    expect(formatHourShort(value, "UTC")).toBe(formatHourShort(zoned, "UTC"));
    expect(formatDateTimeShort(value, "UTC")).toBe(formatDateTimeShort(zoned, "UTC"));
    expect(formatRelativeHourShort(value, value, "UTC")).toBe(
      formatRelativeHourShort(zoned, zoned, "UTC"),
    );
  });

  it("enumerates inclusive UTC dates across a year boundary", () => {
    expect(enumerateDays("2025-12-31", "2026-01-02")).toEqual([
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });
});

describe("locale-aware usage formatting", () => {
  const ARABIC = "ar-SA-u-nu-latn-ca-gregory";

  it("keeps English output unchanged when no locale is given", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatCount(1234567)).toBe("1,234,567");
    expect(formatTokens(19_900_000_000)).toBe("19.9B");
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatDayShort("2026-08-07")).toBe("Aug 7");
    expect(formatDateTimeShort("2026-08-11T14:37:00Z", "UTC")).toBe("Aug 11, 2 PM");
    expect(formatRelativeHourShort("2026-08-11T14:00:00Z", "2026-08-11T20:00:00Z", "UTC")).toBe(
      "2 PM today",
    );
    expect(formatRelativeHourShort("2026-08-10T14:00:00Z", "2026-08-11T20:00:00Z", "UTC")).toBe(
      "2 PM yesterday",
    );
  });

  it("formats Arabic with Western digits and the Gregorian calendar", () => {
    expect(formatCount(1234567, ARABIC)).toMatch(/^[0-9,\u066c\u200e\u200f ]+$/);
    expect(formatUsd(1234.5, ARABIC)).toMatch(/1[,\u066c]234[.\u066b]50/);
    expect(formatDayShort("2026-08-07", ARABIC)).toMatch(/^[^\u0660-\u0669\u06f0-\u06f9]*$/);
    expect(formatDayShort("2026-08-07", ARABIC)).toContain("7");
  });

  it("follows the interface language for dates, not the host", () => {
    expect(formatDayShort("2026-08-07", "zh-CN")).toBe("8月7日");
    expect(formatUsd(1.5, "zh-CN")).toContain("1.50");
  });

  it("names today and yesterday in the interface language", () => {
    expect(
      formatRelativeHourShort("2026-08-11T14:00:00Z", "2026-08-11T20:00:00Z", "UTC", "zh-CN"),
    ).toContain("今天");
  });
});
