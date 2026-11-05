import * as NodeWorkerThreads from "node:worker_threads";

import type { EmbedWorkerRequest } from "../embedWorkerProtocol.ts";

/** Stands in for the ONNX worker: burns CPU for each embed so the test can watch the main thread. */
NodeWorkerThreads.parentPort?.on("message", (request: EmbedWorkerRequest) => {
  if (request.type === "init") {
    NodeWorkerThreads.parentPort?.postMessage({ type: "ready", dims: 4 });

    return;
  }

  const until = Date.now() + 300;

  while (Date.now() < until) {
    // busy
  }

  NodeWorkerThreads.parentPort?.postMessage({
    type: "result",
    id: request.id,
    vectors: request.texts.map((text) => Float32Array.from([text.length, 0, 0, 0])),
  });
});
