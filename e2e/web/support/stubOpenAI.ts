import * as NodeHttp from "node:http";

export const STUB_MODEL = "e2e-stub-model";

/** The stub answers as the bot named in the system prompt ("You are <name>, ..."), so a wrong responder shows. */
export const stubReplyFrom = (botName: string) => `Stub reply from ${botName}.`;

/**
 * Scripted words, switched on by a marker in the user's own message: `[say:Bot1=@Bot2, go on;Bot2=...]`
 * appends each listed bot's text to its reply, on a new paragraph. `~` stands for `@`, since an `@Name` in the user's own message would address that bot. A chained turn reads the user's message
 * through shared history, so the marker keeps working for every bot that answers after it.
 */
const SAY_MARKER = /\[say:([^\]]*)\]/;

export interface StubCompletion {
  readonly bot: string;
  /** The last user message of the request, which is the turn being answered. */
  readonly user: string;
  /** The raw request body, for tests that check what a bot was actually sent. */
  readonly body: string;
}

export interface StubOpenAI {
  readonly baseUrl: string;
  readonly requests: ReadonlyArray<string>;
  /** Every chat completion answered, in order. */
  readonly completions: ReadonlyArray<StubCompletion>;
  readonly close: () => Promise<void>;
}

function readBody(request: NodeHttp.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function botNameFrom(body: string): string {
  return /You are ([^,"\\]+),/.exec(body)?.[1] ?? "unknown bot";
}

function lastUserTextFrom(body: string): string {
  const users = [...body.matchAll(/"role":"user","content":"((?:[^"\\]|\\.)*)"/g)];

  return users.at(-1)?.[1] ?? "";
}

/** The latest message the user wrote, skipping other bots' replies that history replays as `<group-message>` user turns. */
function lastHumanTextFrom(body: string): string {
  const users = [...body.matchAll(/"role":"user","content":"((?:[^"\\]|\\.)*)"/g)].map(
    (match) => match[1] ?? "",
  );

  return users.findLast((text) => !text.startsWith("<group-message")) ?? "";
}

/** The reply `bot` gives: the stub line, plus the words the user's message scripts for it. */
function replyFor(bot: string, human: string): string {
  const script = SAY_MARKER.exec(human)?.[1] ?? "";

  for (const entry of script.split(";")) {
    const at = entry.indexOf("=");

    if (at > 0 && entry.slice(0, at) === bot) {
      return `${stubReplyFrom(bot)}\n\n${entry.slice(at + 1).replaceAll("~", "@")}`;
    }
  }

  return stubReplyFrom(bot);
}

function wantsStream(body: string): boolean {
  return /"stream"\s*:\s*true/.test(body);
}

/** A user message with this marker makes the stub call a protected delete tool, which always waits on an approval. */
export const STUB_APPROVAL_MARKER = "[needs approval]";

interface RequestMessage {
  readonly role?: string;
  readonly content?: string | ReadonlyArray<{ readonly text?: string }> | null;
}

function requestMessages(body: string): ReadonlyArray<RequestMessage> {
  try {
    const parsed: { readonly messages?: ReadonlyArray<RequestMessage> } = JSON.parse(body);

    return parsed.messages ?? [];
  } catch {
    return [];
  }
}

function textOf(message: RequestMessage | undefined): string {
  const content = message?.content;

  return Array.isArray(content)
    ? content.map((part) => part.text ?? "").join("")
    : String(content ?? "");
}

/** A user message with this marker makes the stub delegate a task to Bravo, whose chat then waits on an approval. */
export const STUB_DELEGATE_MARKER = "[delegate]";

const APPROVAL_TOOL_CALL = {
  index: 0,
  id: "call_e2e_approval",
  type: "function",
  function: { name: "UninstallMcpServer", arguments: JSON.stringify({ serverId: "e2e-server" }) },
};

/**
 * Delegation takes a bot id, and the group's roster in the system prompt ("- Bravo (bot-…), …") is where a
 * real model finds it. The delegated task carries the approval marker, so Bravo's turn on it ends in the
 * protected tool call.
 */
function delegateToolCall(body: string) {
  const botId = /- Bravo \((bot-[\w-]+)\)/.exec(body)?.[1] ?? "Bravo";

  return {
    index: 0,
    id: "call_e2e_delegate",
    type: "function",
    function: {
      name: "SendToAgent",
      arguments: JSON.stringify({
        botId,
        task: `Take this over ${STUB_APPROVAL_MARKER}`,
        expectedResult: "Done.",
      }),
    },
  };
}

/** The tool call a request scripts, while the marker message is the latest turn; the request after a tool result ends in a tool message. */
function toolCallFor(body: string): typeof APPROVAL_TOOL_CALL | undefined {
  const last = requestMessages(body).at(-1);

  if (last?.role !== "user") {
    return undefined;
  }

  const text = textOf(last);

  if (text.includes(STUB_APPROVAL_MARKER)) {
    return APPROVAL_TOOL_CALL;
  }

  return text.includes(STUB_DELEGATE_MARKER) ? delegateToolCall(body) : undefined;
}

function chunk(delta: { role?: string; content?: string }, finishReason: string | null) {
  return `data: ${JSON.stringify({
    id: "chatcmpl-e2e",
    object: "chat.completion.chunk",
    created: 0,
    model: STUB_MODEL,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

/**
 * A minimal OpenAI-compatible endpoint: it lists one model and answers every
 * chat completion with the same fixed reply, streamed or not. It lets the
 * journeys exercise the real provider path without a subscription or network.
 */
export async function startStubOpenAI(): Promise<StubOpenAI> {
  const requests: Array<string> = [];
  const completions: Array<StubCompletion> = [];

  const server = NodeHttp.createServer((request, response) => {
    const path = (request.url ?? "").split("?")[0] ?? "";

    requests.push(`${request.method ?? "GET"} ${path}`);

    if (request.method === "GET" && path.endsWith("/models")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ object: "list", data: [{ id: STUB_MODEL, object: "model" }] }));

      return;
    }

    if (request.method === "POST" && path.endsWith("/chat/completions")) {
      void readBody(request).then((body) => {
        const bot = botNameFrom(body);

        const text = replyFor(bot, lastHumanTextFrom(body));

        completions.push({ bot, user: lastUserTextFrom(body), body });

        const toolCall = toolCallFor(body);

        if (toolCall) {
          if (wantsStream(body)) {
            response.writeHead(200, { "content-type": "text/event-stream" });
            response.write(chunk({ role: "assistant", content: "" }, null));
            response.write(
              `data: ${JSON.stringify({
                id: "chatcmpl-e2e",
                object: "chat.completion.chunk",
                created: 0,
                model: STUB_MODEL,
                choices: [{ index: 0, delta: { tool_calls: [toolCall] }, finish_reason: null }],
              })}\n\n`,
            );
            response.write(chunk({}, "tool_calls"));
            response.end("data: [DONE]\n\n");
          } else {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
              JSON.stringify({
                id: "chatcmpl-e2e",
                object: "chat.completion",
                created: 0,
                model: STUB_MODEL,
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: null,
                      tool_calls: [{ ...toolCall, index: undefined }],
                    },
                    finish_reason: "tool_calls",
                  },
                ],
                usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
              }),
            );
          }

          return;
        }

        if (wantsStream(body)) {
          response.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
          });
          response.write(chunk({ role: "assistant", content: "" }, null));
          response.write(chunk({ content: text }, null));
          response.write(chunk({}, "stop"));
          response.end("data: [DONE]\n\n");

          return;
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            id: "chatcmpl-e2e",
            object: "chat.completion",
            created: 0,
            model: STUB_MODEL,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: text },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });

      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: `no stub for ${path}` } }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  const address = server.address();

  if (!(address instanceof Object)) {
    throw new Error("The stub endpoint did not bind a TCP port.");
  }

  const { port } = address;

  return {
    baseUrl: `http://127.0.0.1:${String(port)}/v1`,
    requests,
    completions,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
