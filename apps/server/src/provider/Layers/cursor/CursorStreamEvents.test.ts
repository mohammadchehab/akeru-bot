import * as NodeFS from "node:fs";
import { describe, expect, it } from "vite-plus/test";

import { createCursorStreamReducer, type CursorTurnEvent } from "./CursorStreamEvents.ts";

const lines = (name: string) =>
  NodeFS.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.length > 0);

const run = (input: ReadonlyArray<string>) => {
  const reducer = createCursorStreamReducer();

  return { events: input.flatMap((line) => reducer.push(line)), reducer };
};

const textOf = (events: ReadonlyArray<CursorTurnEvent>, type: CursorTurnEvent["type"]) =>
  events.flatMap((event) => (event.type === type && "text" in event ? [event.text] : [])).join("");

describe("createCursorStreamReducer on a recorded read-file turn", () => {
  const { events } = run(lines("turn-read-file.ndjson"));

  it("reports the session id once, from system.init", () => {
    expect(events.filter((event) => event.type === "session")).toEqual([
      { type: "session", sessionId: "00000000-0000-4000-8000-000000000001" },
    ]);
  });

  it("streams each text segment once, dropping Cursor's per-segment full-text repeat", () => {
    expect(textOf(events, "text.delta")).toBe(
      "> Auto routed to Grok 4.7\n\nI'll read `notes.txt` and report the launch codeword in one sentence.The launch codeword is KESTREL.",
    );
  });

  it("maps thinking deltas to reasoning", () => {
    expect(textOf(events, "reasoning.delta").length).toBeGreaterThan(0);
  });

  it("maps a tool call to started and completed activity keyed by the tool kind", () => {
    const tools = events.filter(
      (event) => event.type === "tool.started" || event.type === "tool.completed",
    );

    expect(tools.map((event) => [event.type, "kind" in event ? event.kind : null])).toEqual([
      ["tool.started", "read"],
      ["tool.completed", "read"],
    ]);
  });

  it("ends with the result and its usage", () => {
    expect(events.at(-1)).toMatchObject({
      type: "result",
      isError: false,
      usage: { inputTokens: 13443, outputTokens: 338, cacheReadTokens: 25088, cacheWriteTokens: 0 },
    });
  });
});

describe("createCursorStreamReducer edge cases", () => {
  it("keeps a lone assistant message that is not a repeat", () => {
    const { events } = run([
      JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "hi" }] } }),
    ]);

    expect(textOf(events, "text.delta")).toBe("hi");
  });

  it("reports an error result as an error", () => {
    const { events } = run([
      JSON.stringify({ type: "result", subtype: "error", is_error: true, result: "boom" }),
    ]);

    expect(events).toEqual([{ type: "result", isError: true, text: "boom", usage: undefined }]);
  });

  it("ignores blank and non-JSON lines", () => {
    expect(run(["", "not json"]).events).toEqual([]);
  });

  it("tracks whether a result was seen, so a signalled exit with no result reads as interrupted", () => {
    expect(run([]).reducer.sawResult()).toBe(false);
    expect(
      run([JSON.stringify({ type: "result", is_error: false, result: "" })]).reducer.sawResult(),
    ).toBe(true);
  });

  it("emits neither started nor completed for an unknown tool_call subtype", () => {
    const line = (subtype: string) =>
      JSON.stringify({
        type: "tool_call",
        subtype,
        call_id: "call-1",
        tool_call: { readToolCall: { args: { path: "a" } } },
      });

    expect(run([line("failed")]).events).toEqual([]);
    expect(run([line("started")]).events).toEqual([
      { type: "tool.started", callId: "call-1", kind: "read", args: { path: "a" } },
    ]);
  });

  it("known limit: a delta equal to the text streamed so far in the segment reads as the repeat", () => {
    const delta = (text: string) =>
      JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text }] } });

    expect(textOf(run([delta("\n\n"), delta("\n\n")]).events, "text.delta")).toBe("\n\n");
  });
});
