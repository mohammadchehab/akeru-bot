import * as NodeCrypto from "node:crypto";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";

import { embeddingModelFileUrl, ensureEmbeddingModel } from "./EmbeddingModelDownload.ts";
import type { EmbeddingModelManifest } from "./EmbeddingModelManifest.ts";

const sha = (text: string) => NodeCrypto.createHash("sha256").update(text).digest("hex");
const revision = "a".repeat(40);

const manifest: EmbeddingModelManifest = {
  name: "tiny",
  repo: "acme/tiny",
  revision,
  dims: 4,
  prefixes: { query: "q: ", passage: "p: " },
  files: [
    { path: "config.json", sha256: sha("{}"), bytes: 2 },
    { path: "onnx/model.onnx", sha256: sha("weights"), bytes: 7 },
  ],
};

const bodies = new Map([
  ["config.json", "{}"],
  ["onnx/model.onnx", "weights"],
]);

const pathOf = (url: string) => manifest.files.find((file) => url.endsWith(`/${file.path}`))?.path ?? "";

const fetchFor =
  (overrides: ReadonlyMap<string, string> = new Map(), urls: string[] = []) =>
  async (url: string) => {
    urls.push(url);

    return new Response(overrides.get(pathOf(url)) ?? bodies.get(pathOf(url)) ?? "", { status: 200 });
  };

/** A models directory inside a fresh temp dir, removed when the test scope closes. */
const tempModels = Effect.acquireRelease(
  Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "isnadi-embed-dl-"))),
  (dir) => Effect.promise(() => NodeFSP.rm(dir, { recursive: true, force: true })),
).pipe(Effect.map((dir) => NodePath.join(dir, "models")));

const modelDirOf = (modelsDir: string) => NodePath.join(modelsDir, `tiny@${revision}`);
const modeOf = (path: string) =>
  Effect.promise(() => NodeFSP.stat(path)).pipe(Effect.map((stat) => stat.mode & 0o777));

describe("ensureEmbeddingModel", () => {
  it.effect("fetches pinned commit-sha urls, verifies them, and stores with 0700 dirs and 0600 files", () =>
    Effect.gen(function* () {
      const modelsDir = yield* tempModels;
      const urls: string[] = [];

      const dir = yield* ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor(new Map(), urls) });

      assert.deepStrictEqual(
        urls,
        manifest.files.map((file) => embeddingModelFileUrl(manifest, file)),
      );
      assert.strictEqual(urls[0], `https://huggingface.co/acme/tiny/resolve/${revision}/config.json`);
      assert.strictEqual(dir, modelDirOf(modelsDir));
      assert.strictEqual(yield* modeOf(dir), 0o700);
      assert.strictEqual(yield* modeOf(NodePath.join(dir, "onnx")), 0o700);
      assert.strictEqual(yield* modeOf(NodePath.join(dir, "onnx/model.onnx")), 0o600);
    }).pipe(Effect.scoped),
  );

  it.effect("deletes a file whose sha256 does not match and fails", () =>
    Effect.gen(function* () {
      const modelsDir = yield* tempModels;

      const exit = yield* Effect.exit(
        ensureEmbeddingModel({
          manifest,
          modelsDir,
          fetch: fetchFor(new Map([["onnx/model.onnx", "tampered"]])),
        }),
      );

      assert.isTrue(Exit.isFailure(exit));
      const leftovers = yield* Effect.promise(() => NodeFSP.readdir(NodePath.join(modelDirOf(modelsDir), "onnx")));
      assert.deepStrictEqual(leftovers, []);
    }).pipe(Effect.scoped),
  );

  it.effect("does not refetch files that already match, and replaces ones that do not", () =>
    Effect.gen(function* () {
      const modelsDir = yield* tempModels;
      const dir = yield* ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor() });
      yield* Effect.promise(() => NodeFSP.writeFile(NodePath.join(dir, "config.json"), "xx"));

      const urls: string[] = [];
      yield* ensureEmbeddingModel({ manifest, modelsDir, fetch: fetchFor(new Map(), urls) });

      assert.deepStrictEqual(urls, [embeddingModelFileUrl(manifest, manifest.files[0]!)]);
      const restored = yield* Effect.promise(() => NodeFSP.readFile(NodePath.join(dir, "config.json"), "utf8"));
      assert.strictEqual(restored, "{}");
    }).pipe(Effect.scoped),
  );

  it.effect("follows https redirects", () =>
    Effect.gen(function* () {
      const modelsDir = yield* tempModels;
      const hops: string[] = [];
      const redirecting = async (url: string) => {
        hops.push(url);
        if (url.startsWith("https://huggingface.co/")) {
          return new Response(null, {
            status: 302,
            headers: { location: `https://cdn.example/${bodies.get(pathOf(url))}` },
          });
        }

        return new Response(url.slice("https://cdn.example/".length));
      };

      yield* ensureEmbeddingModel({ manifest, modelsDir, fetch: redirecting });

      assert.isTrue(hops.includes("https://cdn.example/weights"));
    }).pipe(Effect.scoped),
  );

  it.effect("refuses a redirect to http", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        ensureEmbeddingModel({
          manifest,
          modelsDir: yield* tempModels,
          fetch: async () => new Response(null, { status: 302, headers: { location: "http://evil.example/x" } }),
        }),
      );

      assert.isTrue(Exit.isFailure(exit));
    }).pipe(Effect.scoped),
  );

  it.effect("fails on a non-200 response", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        ensureEmbeddingModel({
          manifest,
          modelsDir: yield* tempModels,
          fetch: async () => new Response("nope", { status: 404 }),
        }),
      );

      assert.isTrue(Exit.isFailure(exit));
    }).pipe(Effect.scoped),
  );
});
