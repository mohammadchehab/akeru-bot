import { describe, expect, it } from "vite-plus/test";

import { effectiveHopBudget, stepHopBudget } from "./groupHopBudget";

describe("hop budget stepper", () => {
  it("reads an unset budget as the default of 6", () => {
    expect(effectiveHopBudget(undefined)).toBe(6);
    expect(effectiveHopBudget(3)).toBe(3);
  });

  it("steps by one and stops at 1 and 20", () => {
    expect(stepHopBudget(6, 1)).toBe(7);
    expect(stepHopBudget(6, -1)).toBe(5);
    expect(stepHopBudget(1, -1)).toBeNull();
    expect(stepHopBudget(20, 1)).toBeNull();
    expect(stepHopBudget(20, -1)).toBe(19);
  });
});
