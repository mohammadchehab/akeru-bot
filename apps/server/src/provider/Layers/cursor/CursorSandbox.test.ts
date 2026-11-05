import { ProviderDriverKind } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { cursorSandboxRejection } from "./CursorSandbox.ts";

const cursor = ProviderDriverKind.make("cursor");

describe("cursorSandboxRejection", () => {
  it("allows Cursor on the local workspace", () => {
    expect(cursorSandboxRejection(cursor, "local")).toBeUndefined();
  });

  it.each(["daytona", "e2b", "vercel", "railway", "tenki", "ascii", "upstash"] as const)(
    "rejects Cursor on the %s sandbox, since the CLI runs on this machine and cannot use it",
    (sandbox) => {
      expect(cursorSandboxRejection(cursor, sandbox)).toContain(sandbox);
      expect(cursorSandboxRejection(cursor, sandbox)).toContain("Local");
    },
  );

  it("fails closed on a sandbox kind it does not know", () => {
    // A future or corrupt value is not Local, so it is rejected rather than let through.
    expect(cursorSandboxRejection(cursor, "someday")).toContain("someday");
  });

  it("leaves every other driver alone", () => {
    expect(cursorSandboxRejection(ProviderDriverKind.make("codex"), "daytona")).toBeUndefined();
  });
});
