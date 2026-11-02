import * as NodeFS from "node:fs";
import { describe, expect, it } from "vite-plus/test";

import { parseCursorStatus } from "./CursorStatus.ts";

const fixture = (name: string) =>
  NodeFS.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("parseCursorStatus", () => {
  it("reads the email from the logged-in text", () => {
    expect(parseCursorStatus(fixture("status-logged-in.txt"))).toEqual({
      authenticated: true,
      email: "dev@example.com",
    });
  });

  it("treats the logged-out text as unauthenticated even though the exit code is 0", () => {
    expect(parseCursorStatus(fixture("status-logged-out.txt"))).toEqual({ authenticated: false });
  });

  it("does not guess when the output is unrecognised", () => {
    expect(parseCursorStatus("something else entirely")).toEqual({ authenticated: false });
  });
});
