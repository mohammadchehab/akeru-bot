import { describe, expect, it } from "vite-plus/test";

import { buildCursorTurnArgs, cursorAccessFor } from "./CursorTurnArgs.ts";

const base = { cwd: "/work/project", prompt: "hello" } as const;

describe("cursorAccessFor", () => {
  it("grants full access only to the explicit full-access runtime mode", () => {
    expect(cursorAccessFor("full-access")).toBe("full");
  });

  it.each(["approval-required", "auto-accept-edits", "auto"] as const)(
    "is read-only for %s, since headless Cursor cannot ask for approval",
    (mode) => {
      expect(cursorAccessFor(mode)).toBe("read-only");
    },
  );

  it("fails closed when the mode is missing", () => {
    expect(cursorAccessFor(undefined)).toBe("read-only");
  });
});

describe("buildCursorTurnArgs", () => {
  it("runs headless stream-json with partial output in the workspace, read-only by default", () => {
    expect(buildCursorTurnArgs({ ...base, runtimeMode: "auto" })).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--stream-partial-output",
      "--trust",
      "--workspace",
      "/work/project",
      "--mode",
      "ask",
      "--",
      "hello",
    ]);
  });

  it("uses --force for full access and never --yolo or --auto-review", () => {
    const args = buildCursorTurnArgs({ ...base, runtimeMode: "full-access" });

    expect(args).toContain("--force");
    expect(args).not.toContain("--mode");
    expect(args).not.toContain("--yolo");
    expect(args).not.toContain("--auto-review");
  });

  it("passes the model through unchanged, including parameterised ids", () => {
    const args = buildCursorTurnArgs({ ...base, model: "claude-opus-4-8[effort=high]" });

    expect(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2)).toEqual([
      "--model",
      "claude-opus-4-8[effort=high]",
    ]);
  });

  it("omits --model for the provider default", () => {
    expect(buildCursorTurnArgs(base)).not.toContain("--model");
  });

  it("resumes the stored session", () => {
    const args = buildCursorTurnArgs({ ...base, resumeSessionId: "sess-1" });

    expect(args.slice(args.indexOf("--resume"), args.indexOf("--resume") + 2)).toEqual([
      "--resume",
      "sess-1",
    ]);
  });

  it("puts the prompt last so a dash-leading prompt is not read as a flag", () => {
    const args = buildCursorTurnArgs({ ...base, prompt: "--force please" });

    expect(args.at(-1)).toBe("--force please");
    expect(args.at(-2)).toBe("--");
  });
});
