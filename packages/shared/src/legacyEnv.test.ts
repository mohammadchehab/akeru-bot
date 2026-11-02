import { describe, expect, it } from "vite-plus/test";

import { applyLegacyProductEnv, ignoredT3HomeWarning } from "./legacyEnv.ts";

describe("applyLegacyProductEnv", () => {
  it("copies AKERU_ variables to their ISNADI_ names", () => {
    const env: NodeJS.ProcessEnv = { AKERU_HOME: "/data", PATH: "/bin" };

    applyLegacyProductEnv(env);

    expect(env.ISNADI_HOME).toBe("/data");
    expect(env.AKERU_HOME).toBe("/data");
  });

  it("never overrides an ISNADI_ variable that is already set", () => {
    const env: NodeJS.ProcessEnv = { AKERU_PORT: "1", ISNADI_PORT: "2" };

    applyLegacyProductEnv(env);

    expect(env.ISNADI_PORT).toBe("2");
  });
});

describe("ignoredT3HomeWarning", () => {
  it("names ISNADI_HOME when T3CODE_HOME is set without it", () => {
    expect(ignoredT3HomeWarning({ T3CODE_HOME: "/home/user/.t3" })).toContain("ISNADI_HOME");
  });

  it("stays quiet when ISNADI_HOME is set or T3CODE_HOME is absent or blank", () => {
    expect(ignoredT3HomeWarning({ T3CODE_HOME: "/x", ISNADI_HOME: "/y" })).toBeUndefined();
    expect(ignoredT3HomeWarning({})).toBeUndefined();
    expect(ignoredT3HomeWarning({ T3CODE_HOME: "  " })).toBeUndefined();
  });
});
