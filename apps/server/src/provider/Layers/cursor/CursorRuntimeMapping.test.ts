import * as NodeFS from "node:fs";
import { describe, expect, it } from "vite-plus/test";

import { createCursorStreamReducer, type CursorTurnEvent } from "./CursorStreamEvents.ts";
import { createCursorRuntimeMapper, type CursorRuntimeDraft } from "./CursorRuntimeMapping.ts";

const fixtureEvents = (): ReadonlyArray<CursorTurnEvent> => {
  const reducer = createCursorStreamReducer();

  return NodeFS.readFileSync(new URL("./fixtures/turn-read-file.ndjson", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .flatMap((line) => reducer.push(line));
};

const mapAll = (events: ReadonlyArray<CursorTurnEvent>) => {
  const mapper = createCursorRuntimeMapper();

  return [...events.flatMap((event) => mapper.map(event)), ...mapper.flush()];
};

const ofType = <T extends CursorRuntimeDraft["type"]>(
  drafts: ReadonlyArray<CursorRuntimeDraft>,
  type: T,
) =>
  drafts.filter((draft): draft is Extract<CursorRuntimeDraft, { type: T }> => draft.type === type);

describe("createCursorRuntimeMapper on a recorded read-file turn", () => {
  const drafts = mapAll(fixtureEvents());

  it("streams assistant text as deltas, one item per segment, completed with the full text", () => {
    const completed = ofType(drafts, "item.completed").filter(
      (draft) => draft.payload.itemType === "assistant_message",
    );

    expect(completed.map((draft) => draft.payload.detail)).toEqual([
      "I'll read `notes.txt` and report the launch codeword in one sentence.",
      "The launch codeword is KESTREL.",
    ]);

    const segmentIds = new Set(
      ofType(drafts, "content.delta")
        .filter((draft) => draft.payload.streamKind === "assistant_text")
        .map((draft) => draft.itemId),
    );

    expect(segmentIds.size).toBe(2);
  });

  it("maps thinking to reasoning deltas and completes the reasoning item", () => {
    expect(
      ofType(drafts, "content.delta").some(
        (draft) => draft.payload.streamKind === "reasoning_text",
      ),
    ).toBe(true);
    expect(
      ofType(drafts, "item.completed").some((draft) => draft.payload.itemType === "reasoning"),
    ).toBe(true);
  });

  it("maps a read tool call to a started and a completed tool item sharing an id", () => {
    const started = ofType(drafts, "item.started").filter(
      (draft) => draft.payload.itemType === "dynamic_tool_call",
    );

    const completed = ofType(drafts, "item.completed").filter(
      (draft) => draft.payload.itemType === "dynamic_tool_call",
    );

    expect(started).toHaveLength(1);
    expect(started.at(0)?.payload.title).toBe("Read");
    expect(completed.at(0)?.itemId).toBe(started.at(0)?.itemId);
    expect(completed.at(0)?.payload.status).toBe("completed");
  });

  it("records the routed model as thread metadata, not as text", () => {
    expect(ofType(drafts, "thread.metadata.updated")).toEqual([
      { type: "thread.metadata.updated", payload: { metadata: { cursorRoutedModel: "Grok 4.7" } } },
    ]);
  });

  it("closes the assistant text segment before the tool starts", () => {
    const order = drafts
      .filter((draft) => draft.type === "item.completed" || draft.type === "item.started")
      .map((draft) => `${draft.type}:${"payload" in draft ? draft.payload.itemType : ""}`);

    expect(order.indexOf("item.completed:assistant_message")).toBeLessThan(
      order.indexOf("item.started:dynamic_tool_call"),
    );
  });
});

describe("createCursorRuntimeMapper tool kinds", () => {
  const tool = (kind: string): CursorTurnEvent => ({
    type: "tool.started",
    callId: "c1",
    kind,
    args: {},
  });

  it.each([
    ["shell", "command_execution"],
    ["edit", "file_change"],
    ["write", "file_change"],
    ["mcp", "mcp_tool_call"],
    ["glob", "dynamic_tool_call"],
    ["somethingNew", "dynamic_tool_call"],
  ] as const)("maps %s to %s", (kind, itemType) => {
    expect(ofType(mapAll([tool(kind)]), "item.started").at(0)?.payload.itemType).toBe(itemType);
  });

  it("marks a tool closed by the end of the turn as failed, not completed", () => {
    const [, closed] = mapAll([
      tool("read"),
      { type: "tool.completed", callId: "c1", kind: "read", result: undefined, aborted: true },
    ]);

    expect(closed).toMatchObject({ type: "item.completed", payload: { status: "failed" } });
  });
});
