import * as NodeCrypto from "node:crypto";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { afterEach, assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";

import { ensureEmbeddingModel, embeddingModelFileUrl } from "./EmbeddingModelDownload.ts";
import type { EmbeddingModelManifest } from "./EmbeddingModelManifest.ts";

const sha = (text: string) => NodeCrypto.createHash("sha256").update(text).digest("hex");

const manifest: EmbeddingModelManifest = {
  name: "tiny",
  repo: "acme/tiny",
  revision: "a".repeat(40),
  dims: 4,
  prefixes: { query: "q: ", passage: "p: " },
  files: [
    { path: "config.json", sha256: sha("{}"), bytes: 2 },
    { path: "onnx/model.onnx", sha256: sha("weights"), bytes: 7 },
  ],
};

const bodies: Record<string, string> = { "config.json": "{}", "onnx/model.onnx": "weights" };

const fetchFor =
  (overrides: Record<string, string> = {}, urls: string[] = []) =>
  async (url: string) => {
    urls.push(url);
    const file = manifest.files.find((entry) => url.endsWith(`/${entry.path}`));

    return new Response(overrides[file?.path ?? ""] ?? bodies[file?.path ?? ""] ?? "", { status: 200 });
  };

const directories: string[] = [];

const tempModels = async () => {
  const dir = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "isnadi-embed-dl-"));
  directories.push(dir);

  return NodePath.join(dir, "models");
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => NodeFSP.rm(dir, { recursive: true, force: true })));
});

describe("ensureEmbeddingModel", () => {
  it("fetches pinned commit-sha urls, verifies them, and stores with 0700 dirs and 0600 files", async () => {
    const modelsDir = await tempModels();
    const urls: string[] = [];

    const dir = await Effect.runPromise(
      ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor({}, urls) }),
    );

    assert.deepStrictEqual(urls, manifest.files.map((file) => embeddingModelFileUrl(manifest, file)));
    assert.strictEqual(urls[0], `https://huggingface.co/acme/tiny/resolve/${"a".repeat(40)}/config.json`);
    assert.strictEqual(dir, NodePath.join(modelsDir, `tiny@${"a".repeat(40)}`));
    assert.strictEqual((await NodeFSP.stat(dir)).mode & 0o777, 0o700);
    assert.strictEqual((await NodeFSP.stat(NodePath.join(dir, "onnx"))).mode & 0o777, 0o700);
    assert.strictEqual((await NodeFSP.stat(NodePath.join(dir, "onnx/model.onnx"))).mode & 0o777, 0o600);
  });

  it("deletes a file whose sha256 does not match and fails", async () => {
    const modelsDir = await tempModels();

    const exit = await Effect.runPromiseExit(
      ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor({ "onnx/model.onnx": "tampered" }) }),
    );

    assert.isTrue(Exit.isFailure(exit));
    const dir = NodePath.join(modelsDir, `tiny@${"a".repeat(40)}`);
    assert.deepStrictEqual(await NodeFSP.readdir(NodePath.join(dir, "onnx")), []);
  });

  it("does not refetch files that already match, and replaces ones that do not", async () => {
    const modelsDir = await tempModels();
    const dir = await Effect.runPromise(ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor() }));
    await NodeFSP.writeFile(NodePath.join(dir, "config.json"), "xx");

    const urls: string[] = [];
    await Effect.runPromise(ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor({}, urls) }));

    assert.deepStrictEqual(urls, [embeddingModelFileUrl(manifest, manifest.files[0]!)]);
    assert.strictEqual(await NodeFSP.readFile(NodePath.join(dir, "config.json"), "utf8"), "{}");
  });

  it("follows https redirects but refuses a redirect to http", async () => {
    const modelsDir = await tempModels();
    const hops: string[] = [];

    const redirecting = async (url: string) => {
      hops.push(url);

      if (url.startsWith("https://huggingface.co/")) {
        return new Response(null, { status: 302, headers: { location: "https://cdn.example/blob" } });
      }

      return new Response(url.endsWith("/blob") && hops.length < 3 ? "{}" : "weights");
    };

    await Effect.runPromise(ensureEmbeddingModel({ manifest, modelsDir, fetch: redirecting }));
    assert.isTrue(hops.some((url) => url === "https://cdn.example/blob"));

    const insecure = await Effect.runPromiseExit(
      ensureEmbeddingModel({
        manifest,
        modelsDir: await tempModels(),
        fetch: async () => new Response(null, { status: 302, headers: { location: "http://evil.example/x" } }),
      }),
    );

    assert.isTrue(Exit.isFailure(insecure));
  });

  it("fails on a non-200 response", async () => {
    const exit = await Effect.runPromiseExit(
      ensureEmbeddingModel({
        manifest,
        modelsDir: await tempModels(),
        fetch: async () => new Response("nope", { status: 404 }),
      }),
    );

    assert.isTrue(Exit.isFailure(exit));
  });
});
