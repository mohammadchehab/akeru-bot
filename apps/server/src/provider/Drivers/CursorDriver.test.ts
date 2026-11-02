import { describe, expect, it } from "vite-plus/test";

import { BUILT_IN_DRIVERS } from "../builtInDrivers.ts";
import { CursorDriver } from "./CursorDriver.ts";

describe("CursorDriver", () => {
  it("is the cursor driver kind, off until the user opts in", () => {
    expect(CursorDriver.driverKind).toBe("cursor");
    expect(CursorDriver.metadata.displayName).toBe("Cursor");
    expect(CursorDriver.defaultConfig()).toMatchObject({ enabled: false, binaryPath: "agent" });
  });

  it("is registered among the built-in drivers", () => {
    expect(BUILT_IN_DRIVERS.map((driver) => driver.driverKind)).toContain("cursor");
  });
});
