import * as NodeWorkerThreads from "node:worker_threads";
import * as Effect from "effect/Effect";

import { ensureEmbeddingModel } from "./EmbeddingModelDownload.ts";
import {
  embeddingModelDirName,
  MULTILINGUAL_E5_SMALL,
  type EmbeddingModelManifest,
} from "./EmbeddingModelManifest.ts";
import { EmbeddingError, type EmbeddingKind, type EmbeddingProvider } from "./EmbeddingProvider.ts";
import type { EmbedWorkerRequest, EmbedWorkerResponse } from "./embedWorkerProtocol.ts";

export interface LocalEmbeddingProvider extends EmbeddingProvider {
  /** Stops the worker now. The next embed starts a fresh one. */
  readonly close: () => Effect.Effect<void>;
}

interface Pending {
  readonly resolve: (vectors: ReadonlyArray<Float32Array>) => void;
  readonly reject: (error: EmbeddingError) => void;
}

const defaultWorkerUrl = () =>
  new URL(import.meta.url.endsWith(".ts") ? "./embedWorker.ts" : "./embedWorker.mjs", import.meta.url);

const runtimeError = (message: string) => new EmbeddingError({ reason: "runtime", message });

/**
 * Embeds on a `worker_threads` worker so inference never blocks the server's event loop. The
 * worker starts on first use and stops after `idleMs` with nothing in flight. The `query: ` and
 * `passage: ` prefixes the model expects are applied here.
 */
export function createLocalEmbeddingProvider(options: {
  readonly modelsDir: string;
  readonly manifest?: EmbeddingModelManifest;
  readonly idleMs?: number;
  readonly threads?: number;
  readonly workerUrl?: URL;
  readonly fetch?: Parameters<typeof ensureEmbeddingModel>[0]["fetch"];
}): LocalEmbeddingProvider {
  const manifest = options.manifest ?? MULTILINGUAL_E5_SMALL;
  const idleMs = options.idleMs ?? 60_000;
  const threads = options.threads ?? 2;

  let started: Promise<NodeWorkerThreads.Worker> | undefined;
  let nextId = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Map<number, Pending>();

  const failAll = (error: EmbeddingError) => {
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
  };

  const stop = async () => {
    const current = started;
    started = undefined;

    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = undefined;
    failAll(runtimeError("Embedding worker stopped."));

    if (current) await current.then((worker) => worker.terminate()).catch(() => undefined);
  };

  const scheduleIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);

    if (pending.size > 0) return;

    idleTimer = setTimeout(() => void stop(), idleMs);
    idleTimer.unref();
  };

  const start = (): Promise<NodeWorkerThreads.Worker> => {
    started ??= (async () => {
      await Effect.runPromise(
        ensureEmbeddingModel({ manifest, modelsDir: options.modelsDir, fetch: options.fetch }),
      );

      const worker = new NodeWorkerThreads.Worker(options.workerUrl ?? defaultWorkerUrl());
      const ready = Promise.withResolvers<number>();

      worker.on("message", (message: EmbedWorkerResponse) => {
        if (message.type === "ready") return ready.resolve(message.dims);

        if (message.type === "result") {
          pending.get(message.id)?.resolve(message.vectors);
          pending.delete(message.id);
        } else if (message.id === undefined) {
          ready.reject(runtimeError(message.message));
        } else {
          pending.get(message.id)?.reject(runtimeError(message.message));
          pending.delete(message.id);
        }

        scheduleIdle();
      });
      worker.on("error", (cause) => {
        ready.reject(runtimeError(cause.message));
        failAll(runtimeError(cause.message));
        started = undefined;
      });
      worker.on("exit", () => {
        failAll(runtimeError("Embedding worker exited."));
        started = undefined;
      });

      const init: EmbedWorkerRequest = {
        type: "init",
        modelsDir: options.modelsDir,
        modelName: embeddingModelDirName(manifest),
        threads,
      };

      worker.postMessage(init);
      await ready.promise;

      return worker;
    })().catch((cause: unknown) => {
      started = undefined;
      throw cause;
    });

    return started;
  };

  const embed = (texts: ReadonlyArray<string>, kind: EmbeddingKind) =>
    Effect.tryPromise({
      try: async () => {
        if (texts.length === 0) return [];

        const worker = await start();

        if (idleTimer) clearTimeout(idleTimer);

        const id = nextId++;
        const prefix = kind === "query" ? manifest.prefixes.query : manifest.prefixes.passage;

        const result = new Promise<ReadonlyArray<Float32Array>>((resolve, reject) =>
          pending.set(id, { resolve, reject }),
        );

        const request: EmbedWorkerRequest = { type: "embed", id, texts: texts.map((t) => prefix + t) };
        worker.postMessage(request);

        return await result;
      },
      catch: (cause) =>
        cause instanceof EmbeddingError
          ? cause
          : runtimeError(cause instanceof Error ? cause.message : "Embedding failed."),
    });

  return {
    setupId: `local:${manifest.name}:${manifest.dims}:${manifest.revision}`,
    dims: manifest.dims,
    embed,
    close: () => Effect.promise(stop),
  };
}
