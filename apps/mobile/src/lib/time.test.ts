import { catalogRegistry, createTranslator } from "@isnadi/client-runtime/i18n";
import { describe, expect, it } from "vite-plus/test";

import { relativeTime } from "./time";

const NOW = Date.parse("2026-11-02T12:00:00.000Z");

const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

describe("relativeTime", () => {
  const english = createTranslator("en");

  it("keeps the compact English labels", () => {
    expect(relativeTime(ago(0), english, NOW)).toBe("<1m");
    expect(relativeTime(ago(5), english, NOW)).toBe("5m");
    expect(relativeTime(ago(3 * 60), english, NOW)).toBe("3h");
    expect(relativeTime(ago(2 * 24 * 60), english, NOW)).toBe("2d");
    expect(relativeTime("not a date", english, NOW)).toBe("<1m");
  });

  it("reads the unit from the catalog, so Simplified Chinese is no longer English", async () => {
    const zhCNCatalog = await catalogRegistry["zh-CN"]?.();
    const chinese = createTranslator("zh-CN", zhCNCatalog);

    expect(relativeTime(ago(5), chinese, NOW)).toBe("5 分钟");
    expect(relativeTime(ago(3 * 60), chinese, NOW)).toBe("3 小时");
    expect(relativeTime(ago(2 * 24 * 60), chinese, NOW)).toBe("2 天");
  });

  it("picks the plural category of the interface language", () => {
    const catalog = {
      "{count}m": "{count}m",
      "{count}m#two": "دقيقتان",
      "{count}m#few": "{count} دقائق",
    };

    const arabic = createTranslator("ar", catalog);

    expect(relativeTime(ago(2), arabic, NOW)).toBe("دقيقتان");
    expect(relativeTime(ago(5), arabic, NOW)).toContain("دقائق");
  });
});
