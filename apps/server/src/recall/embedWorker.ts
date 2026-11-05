import { parentPort } from "node:worker_threads";

import type { EmbedWorkerRequest, EmbedWorkerResponse } from "./embedWorkerProtocol.ts";

type Extractor = (
  texts: ReadonlyArray<string>,
  options: { readonly pooling: "mean"; readonly normalize: true },
) => Promise<{ readonly data: Float32Array; readonly dims: ReadonlyArray<number> }>;

const port = parentPort;
let extractor: Extractor | undefined;

const send = (message: EmbedWorkerResponse, transfer: ArrayBuffer[] = []) =>
  port?.postMessage(message, transfer);

const messageOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

async function init(request: Extract<EmbedWorkerRequest, { type: "init" }>) {
  const { env, pipeline } = await import("@huggingface/transformers");

  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = request.modelsDir;

  const created = await pipeline("feature-extraction", request.modelName, {
    dtype: "q8",
    session_options: { intraOpNumThreads: request.threads },
  });
  extractor = (texts, options) => created(texts.slice(), options);

  const probe = await extractor(["warmup"], { pooling: "mean", normalize: true });
  send({ type: "ready", dims: probe.dims[probe.dims.length - 1] ?? 0 });
}

async function embed(request: Extract<EmbedWorkerRequest, { type: "embed" }>) {
  if (!extractor) throw new Error("Embedding worker is not initialised.");

  const output = await extractor(request.texts, { pooling: "mean", normalize: true });
  const dims = output.dims[output.dims.length - 1] ?? 0;
  const vectors = request.texts.map((_, index) => output.data.slice(index * dims, (index + 1) * dims));

  send(
    { type: "result", id: request.id, vectors },
    vectors.map((vector) => vector.buffer as ArrayBuffer),
  );
}

port?.on("message", (request: EmbedWorkerRequest) => {
  const run = request.type === "init" ? init(request) : embed(request);
  run.catch((cause: unknown) =>
    send({
      type: "error",
      ...(request.type === "embed" ? { id: request.id } : {}),
      message: messageOf(cause),
    }),
  );
});
