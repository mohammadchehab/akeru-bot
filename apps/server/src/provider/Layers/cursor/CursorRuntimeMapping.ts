/**
 * Maps Cursor turn events to runtime-event drafts: the type and payload of a provider runtime
 * event without its ids and timestamps, which the adapter adds. Text and reasoning stream as
 * deltas of one item per segment, and a segment is completed with its full text when a tool
 * starts or the turn ends.
 *
 * @module provider/Layers/cursor/CursorRuntimeMapping
 */
import type { ContentDeltaPayload, ItemLifecyclePayload } from "@isnadi/contracts";

import type { CursorTurnEvent } from "./CursorStreamEvents.ts";

export type CursorRuntimeDraft =
  | {
      readonly type: "content.delta";
      readonly itemId: string;
      readonly payload: ContentDeltaPayload;
    }
  | {
      readonly type: "item.started" | "item.completed";
      readonly itemId: string;
      readonly payload: ItemLifecyclePayload;
    }
  | {
      readonly type: "thread.metadata.updated";
      readonly payload: { readonly metadata: Readonly<Record<string, string>> };
    };

type ToolItemType = "command_execution" | "file_change" | "mcp_tool_call" | "dynamic_tool_call";

function toolItemType(kind: string): ToolItemType {
  switch (kind) {
    case "shell":
      return "command_execution";
    case "edit":
    case "write":
    case "delete":
    case "applyPatch":
      return "file_change";
    case "mcp":
      return "mcp_tool_call";
    default:
      return "dynamic_tool_call";
  }
}

const toolTitle = (kind: string) => `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;

interface OpenText {
  readonly itemId: string;
  text: string;
}

export interface CursorRuntimeMapper {
  readonly map: (event: CursorTurnEvent) => ReadonlyArray<CursorRuntimeDraft>;
  /** Completes any text or reasoning item still open; call once the turn's events are drained. */
  readonly flush: () => ReadonlyArray<CursorRuntimeDraft>;
}

export function createCursorRuntimeMapper(): CursorRuntimeMapper {
  let counter = 0;
  let assistant: OpenText | undefined;
  let reasoning: OpenText | undefined;

  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const complete = (
    open: OpenText | undefined,
    itemType: "assistant_message" | "reasoning",
    title: string,
  ): ReadonlyArray<CursorRuntimeDraft> =>
    open === undefined
      ? []
      : [
          {
            type: "item.completed",
            itemId: open.itemId,
            payload: {
              itemType,
              status: "completed",
              title,
              ...(open.text.length > 0 ? { detail: open.text } : {}),
            },
          },
        ];

  const closeText = (): ReadonlyArray<CursorRuntimeDraft> => {
    const closed = [
      ...complete(reasoning, "reasoning", "Reasoning"),
      ...complete(assistant, "assistant_message", "Assistant message"),
    ];

    assistant = undefined;
    reasoning = undefined;

    return closed;
  };

  const map = (event: CursorTurnEvent): ReadonlyArray<CursorRuntimeDraft> => {
    switch (event.type) {
      case "session":
      case "result":
        return [];
      case "routed":
        return [
          {
            type: "thread.metadata.updated",
            payload: { metadata: { cursorRoutedModel: event.model } },
          },
        ];
      case "reasoning.delta": {
        reasoning ??= { itemId: nextId("reasoning"), text: "" };
        reasoning.text += event.text;

        return [
          {
            type: "content.delta",
            itemId: reasoning.itemId,
            payload: { streamKind: "reasoning_text", delta: event.text },
          },
        ];
      }

      case "text.delta": {
        // Reasoning ends where the answer starts.
        const closedReasoning = complete(reasoning, "reasoning", "Reasoning");

        reasoning = undefined;
        assistant ??= { itemId: nextId("assistant"), text: "" };
        assistant.text += event.text;

        return [
          ...closedReasoning,
          {
            type: "content.delta",
            itemId: assistant.itemId,
            payload: { streamKind: "assistant_text", delta: event.text },
          },
        ];
      }

      case "tool.started":
        return [
          ...closeText(),
          {
            type: "item.started",
            itemId: event.callId,
            payload: {
              itemType: toolItemType(event.kind),
              status: "inProgress",
              title: toolTitle(event.kind),
              data: { args: event.args },
            },
          },
        ];
      case "tool.completed":
        return [
          {
            type: "item.completed",
            itemId: event.callId,
            payload: {
              itemType: toolItemType(event.kind),
              status: event.aborted === true ? "failed" : "completed",
              title: toolTitle(event.kind),
              data: { result: event.result },
            },
          },
        ];
    }
  };

  return { map, flush: closeText };
}
