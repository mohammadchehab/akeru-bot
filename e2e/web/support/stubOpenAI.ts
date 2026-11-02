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

/** A user message with this marker makes the stub ask for a Shell call, which waits on an approval. */
export const STUB_APPROVAL_MARKER = "[needs approval]";

/** The follow-up request after a tool ran or was declined carries a tool message. */
function wantsApproval(body: string): boolean {
  return lastUserTextFrom(body).includes(STUB_APPROVAL_MARKER) && !/"role":"tool"/.test(body);
}

const SHELL_TOOL_CALL = {
  index: 0,
  id: "call_e2e_shell",
  type: "function",
  function: { name: "Shell", arguments: JSON.stringify({ command: "echo decisions" }) },
};

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

        if (wantsApproval(body)) {
          if (wantsStream(body)) {
            response.writeHead(200, { "content-type": "text/event-stream" });
            response.write(chunk({ role: "assistant", content: "" }, null));
            response.write(
              `data: ${JSON.stringify({
                id: "chatcmpl-e2e",
                object: "chat.completion.chunk",
                created: 0,
                model: STUB_MODEL,
                choices: [
                  { index: 0, delta: { tool_calls: [SHELL_TOOL_CALL] }, finish_reason: null },
                ],
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
                      tool_calls: [{ ...SHELL_TOOL_CALL, index: undefined }],
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
