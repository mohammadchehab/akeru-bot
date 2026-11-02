import { createIsnadiToolRuntime, type IsnadiToolRuntime } from "../IsnadiToolRuntime.ts";

/** Override the behavior a test observes while retaining the complete runtime contract. */
export function toolRuntimeFixture(overrides: Partial<IsnadiToolRuntime> = {}): IsnadiToolRuntime {
  return { ...createIsnadiToolRuntime(), ...overrides };
}
