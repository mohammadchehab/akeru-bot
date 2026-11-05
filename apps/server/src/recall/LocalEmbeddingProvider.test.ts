import * as NodeCrypto from "node:crypto";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { afterEach, assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import type { EmbeddingModelManifest } from "./EmbeddingModelManifest.ts";
import { makeLocalEmbeddingProvider } from "./LocalEmbeddingProvider.ts";

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
const directories: string[] = [];
const providers: Array<ReturnType<typeof makeLocalEmbeddingProvider>> = [];

const make = async () => {
  const dir = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "isnadi-embed-provider-"));
  directories.push(dir);
  const provider = makeLocalEmbeddingProvider({
    modelsDir: NodePath.join(dir, "models"),
    manifest,
    workerUrl,
    fetch: async () => new Response("{}"),
  });
  providers.push(provider);

  return provider;
};

afterEach(async () => {
  await Promise.all(providers.splice(0).map((provider) => Effect.runPromise(provider.close())));
  await Promise.all(directories.splice(0).map((dir) => NodeFSP.rm(dir, { recursive: true, force: true })));
});

describe("makeLocalEmbeddingProvider", () => {
  it("builds the setupId from kind, model, dims and revision", async () => {
    const provider = await make();

    assert.strictEqual(provider.setupId, `local:stub:4:${"b".repeat(40)}`);
    assert.strictEqual(provider.dims, 4);
  });

  it("applies the query and passage prefixes before the worker sees the text", async () => {
    const provider = await make();

    const [query] = await Effect.runPromise(provider.embed(["abc"], "query"));
    const [passage] = await Effect.runPromise(provider.embed(["abc"], "passage"));

    assert.strictEqual(query?.[0], "query: abc".length);
    assert.strictEqual(passage?.[0], "passage: abc".length);
  });

  it("does not block the event loop while the worker computes", async () => {
    const provider = await make();
    await Effect.runPromise(provider.embed(["warm"], "query"));

    let worstGap = 0;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      worstGap = Math.max(worstGap, now - last);
      last = now;
    }, 10);

    // The stub burns 300 ms of CPU per call; on the main thread this would stall the timer.
    await Effect.runPromise(provider.embed(["a", "b"], "passage"));
    clearInterval(timer);

    assert.isBelow(worstGap, 150);
  });

  it("returns nothing for an empty batch without starting a worker", async () => {
    const provider = await make();

    assert.deepStrictEqual(await Effect.runPromise(provider.embed([], "query")), []);
  });
});
