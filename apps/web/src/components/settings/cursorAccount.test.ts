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

  it("shows the account email once signed in", () => {
    expect(
      cursorAccountState(
        provider({
          installed: true,
          auth: { status: "authenticated", email: "dev@example.com" },
        }),
      ),
    ).toEqual({ kind: "signed-in", email: "dev@example.com" });
  });

  it("keeps sign-out available when the login came from CURSOR_API_KEY without an email", () => {
    expect(
      cursorAccountState(provider({ installed: true, auth: { status: "authenticated" } })),
    ).toEqual({ kind: "signed-in", email: null });
  });
});
