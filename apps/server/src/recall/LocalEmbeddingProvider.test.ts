import * as NodeCrypto from "node:crypto";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import type { EmbeddingModelManifest } from "./EmbeddingModelManifest.ts";
import { createLocalEmbeddingProvider } from "./LocalEmbeddingProvider.ts";

const sha = (text: string) => NodeCrypto.createHash("sha256").update(text).digest("hex");
const manifest: EmbeddingModelManifest = {
  name: "stub",
  repo: "acme/stub",
  revision: "b".repeat(40),
  dims: 4,
  prefixes: { query: "query: ", passage: "passage: " },
  files: [{ path: "config.json", sha256: sha("{}"), bytes: 2 }],
};

const workerUrl = new URL("./fixtures/busyEmbedWorker.ts", import.meta.url);

/** A provider on a stub worker and a temp models dir; both are cleaned up when the scope closes. */
const provider = Effect.gen(function* () {
  const dir = yield* Effect.acquireRelease(
    Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "isnadi-embed-provider-"))),
    (path) => Effect.promise(() => NodeFSP.rm(path, { recursive: true, force: true })),
  );

  return yield* Effect.acquireRelease(
    Effect.sync(() =>
      createLocalEmbeddingProvider({
        modelsDir: NodePath.join(dir, "models"),
        manifest,
        workerUrl,
        fetch: async () => new Response("{}"),
      }),
    ),
    (created) => created.close(),
  );
});

describe("createLocalEmbeddingProvider", () => {
  it.effect("builds the setupId from kind, model, dims and revision", () =>
    Effect.gen(function* () {
      const embeddings = yield* provider;

      assert.strictEqual(embeddings.setupId, `local:stub:4:${"b".repeat(40)}`);
      assert.strictEqual(embeddings.dims, 4);
    }).pipe(Effect.scoped),
  );

  it.effect("applies the query and passage prefixes before the worker sees the text", () =>
    Effect.gen(function* () {
      const embeddings = yield* provider;

      const [query] = yield* embeddings.embed(["abc"], "query");
      const [passage] = yield* embeddings.embed(["abc"], "passage");

      assert.strictEqual(query?.[0], "query: abc".length);
      assert.strictEqual(passage?.[0], "passage: abc".length);
    }).pipe(Effect.scoped),
  );

  it.effect("does not block the event loop while the worker computes", () =>
    Effect.gen(function* () {
      const embeddings = yield* provider;
      yield* embeddings.embed(["warm"], "query");

      let worstGap = 0;
      let last = performance.now();
      const timer = setInterval(() => {
        const now = performance.now();
        worstGap = Math.max(worstGap, now - last);
        last = now;
      }, 10);

      // The stub burns 300 ms of CPU per call; on the main thread this would stall the timer.
      yield* embeddings.embed(["a", "b"], "passage").pipe(Effect.ensuring(Effect.sync(() => clearInterval(timer))));

      assert.isBelow(worstGap, 150);
    }).pipe(Effect.scoped),
  );

  it.effect("returns nothing for an empty batch", () =>
    Effect.gen(function* () {
      const embeddings = yield* provider;

      assert.deepStrictEqual(yield* embeddings.embed([], "query"), []);
    }).pipe(Effect.scoped),
  );
});
