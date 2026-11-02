/**
 * Maps one `agent -p --output-format stream-json --stream-partial-output` line to
 * neutral turn events. With partial output Cursor streams text deltas and then
 * repeats each finished segment's full text as one more `assistant` event; the
 * reducer drops that repeat so text is emitted once.
 *
 * @module provider/Layers/cursor/CursorStreamEvents
 */
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export interface CursorUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

export type CursorTurnEvent =
  | { readonly type: "session"; readonly sessionId: string }
  | { readonly type: "text.delta"; readonly text: string }
  | { readonly type: "reasoning.delta"; readonly text: string }
  | {
      readonly type: "tool.started";
      readonly callId: string;
      readonly kind: string;
      readonly args: unknown;
    }
  | {
      readonly type: "tool.completed";
      readonly callId: string;
      readonly kind: string;
      readonly result: unknown;
    }
  | {
      readonly type: "result";
      readonly isError: boolean;
      readonly text: string;
      readonly usage: CursorUsage | undefined;
    };

export interface CursorStreamReducer {
  /** Feeds one stdout line and returns the events it produced (none for blank or non-JSON lines). */
  readonly push: (line: string) => ReadonlyArray<CursorTurnEvent>;
  /** True once a `result` event was seen; a signalled exit without one is an interrupted turn. */
  readonly sawResult: () => boolean;
}

const UsageLine = Schema.Struct({
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cacheReadTokens: Schema.optional(Schema.Number),
  cacheWriteTokens: Schema.optional(Schema.Number),
});

const ToolCallRecord = Schema.Record(Schema.String, Schema.Json);

const CursorLine = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("system"),
    subtype: Schema.optional(Schema.String),
    session_id: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    type: Schema.Literal("thinking"),
    subtype: Schema.optional(Schema.String),
    text: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    type: Schema.Literal("assistant"),
    message: Schema.Struct({
      content: Schema.Array(Schema.Struct({ text: Schema.optional(Schema.String) })),
    }),
  }),
  Schema.Struct({
    type: Schema.Literal("tool_call"),
    subtype: Schema.optional(Schema.String),
    call_id: Schema.String,
    tool_call: ToolCallRecord,
  }),
  Schema.Struct({
    type: Schema.Literal("result"),
    is_error: Schema.optional(Schema.Boolean),
    result: Schema.optional(Schema.String),
    usage: Schema.optional(UsageLine),
  }),
]);

const ToolBody = Schema.Struct({
  args: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
});

const decodeLine = Schema.decodeUnknownOption(Schema.fromJsonString(CursorLine));

const decodeToolBody = Schema.decodeUnknownOption(ToolBody);

const TOOL_KEY = /^(.+)ToolCall$/;

/** The tool kind is the key name (`readToolCall` -> `read`); there is no separate name field. */
function findTool(toolCall: typeof ToolCallRecord.Type) {
  for (const [key, body] of Object.entries(toolCall)) {
    const kind = TOOL_KEY.exec(key)?.[1];

    if (kind !== undefined) return { kind, body: decodeToolBody(body) };
  }

  return undefined;
}

export function createCursorStreamReducer(): CursorStreamReducer {
  let segment = "";
  let resultSeen = false;

  const push = (line: string): ReadonlyArray<CursorTurnEvent> => {
    const decoded = decodeLine(line);

    if (Option.isNone(decoded)) return [];

    const event = decoded.value;

    switch (event.type) {
      case "system":
        return event.subtype === "init" && event.session_id !== undefined
          ? [{ type: "session", sessionId: event.session_id }]
          : [];
      case "thinking":
        return event.subtype === "delta" && event.text
          ? [{ type: "reasoning.delta", text: event.text }]
          : [];
      case "assistant": {
        const text = event.message.content.map((part) => part.text ?? "").join("");

        if (text.length === 0) return [];

        if (segment.length > 0 && text === segment) {
          segment = "";

          return [];
        }

        segment += text;

        return [{ type: "text.delta", text }];
      }

      case "tool_call": {
        const tool = findTool(event.tool_call);

        if (tool === undefined) return [];

        segment = "";
        const body = Option.getOrUndefined(tool.body);

        return event.subtype === "completed"
          ? [
              {
                type: "tool.completed",
                callId: event.call_id,
                kind: tool.kind,
                result: body?.result,
              },
            ]
          : [{ type: "tool.started", callId: event.call_id, kind: tool.kind, args: body?.args }];
      }

      case "result": {
        resultSeen = true;
        segment = "";

        return [
          {
            type: "result",
            isError: event.is_error === true,
            text: event.result ?? "",
            usage: event.usage && {
              inputTokens: event.usage.inputTokens ?? 0,
              outputTokens: event.usage.outputTokens ?? 0,
              cacheReadTokens: event.usage.cacheReadTokens ?? 0,
              cacheWriteTokens: event.usage.cacheWriteTokens ?? 0,
            },
          },
        ];
      }
    }
  };

  return { push, sawResult: () => resultSeen };
}
