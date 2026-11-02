import * as NodeHttp from "node:http";

export const STUB_MODEL = "e2e-stub-model";

export const STUB_REPLY = "Stub reply from the e2e endpoint.";

export interface StubOpenAI {
  readonly baseUrl: string;
  readonly requests: ReadonlyArray<string>;
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

function wantsStream(body: string): boolean {
  return /"stream"\s*:\s*true/.test(body);
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
        if (wantsStream(body)) {
          response.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
          });
          response.write(chunk({ role: "assistant", content: "" }, null));
          response.write(chunk({ content: STUB_REPLY }, null));
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
                message: { role: "assistant", content: STUB_REPLY },
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
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
