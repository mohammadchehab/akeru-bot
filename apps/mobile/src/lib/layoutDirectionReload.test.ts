import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("expo-updates", () => ({ reloadAsync: vi.fn() }));

vi.mock("react-native", () => ({
  DevSettings: { reload: vi.fn() },
  I18nManager: { allowRTL: vi.fn(), forceRTL: vi.fn() },
}));

vi.mock("../features/updates/app-updates", () => ({ defaultFlushPendingWrites: vi.fn() }));

import { reloadWithLayoutDirection, type LayoutDirectionRuntime } from "./layoutDirectionReload";

function fakeRuntime(flush: () => Promise<void> = async () => undefined) {
  const calls: string[] = [];

  const runtime: LayoutDirectionRuntime = {
    allowRTL: (allow) => calls.push(`allowRTL(${String(allow)})`),
    forceRTL: (force) => calls.push(`forceRTL(${String(force)})`),
    flush: async () => {
      calls.push("flush");
      await flush();
    },
    reload: async () => {
      calls.push("reload");
    },
  };

  return { calls, runtime };
}

describe("reloadWithLayoutDirection", () => {
  it("asks the platform for right-to-left, saves pending writes, then reloads", async () => {
    const { calls, runtime } = fakeRuntime();

    await reloadWithLayoutDirection("rtl", runtime);

    expect(calls).toEqual(["allowRTL(true)", "forceRTL(true)", "flush", "reload"]);
  });

  it("asks for left-to-right when leaving a right-to-left language", async () => {
    const { calls, runtime } = fakeRuntime();

    await reloadWithLayoutDirection("ltr", runtime);

    expect(calls).toContain("forceRTL(false)");
  });

  it("still reloads when saving pending writes fails", async () => {
    const { calls, runtime } = fakeRuntime(() => Promise.reject(new Error("disk full")));

    await reloadWithLayoutDirection("rtl", runtime);

    expect(calls.at(-1)).toBe("reload");
  });
});
