import { describe, expect, it } from "vite-plus/test";

import { parseCursorLoginUrl } from "./CursorLogin.ts";

describe("parseCursorLoginUrl", () => {
  it("finds the https login link in the CLI's browser prompt", () => {
    const output = [
      "Starting login process...",
      "Authenticating with Cursor...",
      "Waiting for browser authentication...",
      "Open a browser and navigate to this link: https://cursor.com/loginDeepControl?challenge=abc&uuid=u-1&mode=login&redirectTarget=cli",
    ].join("\n");

    expect(parseCursorLoginUrl(output)).toBe(
      "https://cursor.com/loginDeepControl?challenge=abc&uuid=u-1&mode=login&redirectTarget=cli",
    );
  });

  it("returns nothing until the link line has been printed", () => {
    expect(parseCursorLoginUrl("Starting login process...\n")).toBeUndefined();
  });

  it("ignores links that are not https", () => {
    expect(parseCursorLoginUrl("go to http://example.com/login")).toBeUndefined();
  });

  it("stops the link before a colour reset, closing bracket or quote", () => {
    expect(parseCursorLoginUrl("go to \u001b[36mhttps://cursor.com/login?a=1\u001b[0m now")).toBe(
      "https://cursor.com/login?a=1",
    );
    expect(parseCursorLoginUrl("(https://cursor.com/login?a=1)")).toBe(
      "https://cursor.com/login?a=1",
    );
  });
});
