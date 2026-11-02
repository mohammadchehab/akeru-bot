import { describe, expect, it } from "vite-plus/test";

import { applyLegacyProductEnv } from "./legacyEnv.ts";

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
