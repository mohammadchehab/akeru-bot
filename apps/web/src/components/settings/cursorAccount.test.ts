import type { ServerProvider } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";

import { cursorAccountState } from "./cursorAccount";

const provider = (patch: Partial<ServerProvider>) => patch as ServerProvider;

describe("cursorAccountState", () => {
  it("waits for the first probe", () => {
    expect(cursorAccountState(undefined)).toEqual({ kind: "checking" });
  });

  it("points at the CLI when it is not installed", () => {
    expect(cursorAccountState(provider({ installed: false }))).toEqual({ kind: "not-installed" });
  });

  it("offers sign-in when the CLI reports no login", () => {
    expect(
      cursorAccountState(provider({ installed: true, auth: { status: "unauthenticated" } })),
    ).toEqual({ kind: "signed-out" });
  });

  it("shows the account the CLI reports once signed in", () => {
    expect(
      cursorAccountState(
        provider({
          installed: true,
          auth: { status: "authenticated", type: "cached_token", label: "dev@example.com" },
        }),
      ),
    ).toEqual({ kind: "signed-in", detail: "dev@example.com" });
  });

  it("keeps sign-out available when the CLI reports no account label", () => {
    expect(
      cursorAccountState(provider({ installed: true, auth: { status: "authenticated" } })),
    ).toEqual({ kind: "signed-in", detail: null });
  });
});
