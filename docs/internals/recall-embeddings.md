# Recall embeddings

The server embeds text locally for chat recall. Code lives in `apps/server/src/recall/`.

- `EmbeddingProvider` is the seam: `setupId`, `dims`, and `embed(texts, "query" | "passage")`. Vectors are L2-normalized. `setupId` is `${kind}:${model}:${dims}:${revision}`, so a stored index knows which setup built it.
- `LocalEmbeddingProvider` runs `@huggingface/transformers` (onnxruntime-node) in a `node:worker_threads` worker, with 2 intra-op threads. The worker starts on first use and stops after 60 seconds idle. The `query: ` and `passage: ` prefixes are added on the main side.
- The default model is multilingual-e5-small int8 (384 dims). `EmbeddingModelManifest.ts` pins the Hugging Face commit SHA and the sha256 and size of every file.
- `EmbeddingModelDownload.ts` fetches only `https://huggingface.co/<repo>/resolve/<sha>/<file>` (https redirects to the CDN are followed). A size or sha256 mismatch deletes the file and fails. Files land in `$ISNADI_HOME/models/<model>@<sha>/` with 0700 directories and 0600 files. The worker runs with `allowRemoteModels = false`.
- The worker is bundled as `dist/embedWorker.mjs` by `build:bundle`.

Smoke check on any machine: `pnpm --filter server recall:embed-smoke [--home-dir <dir>]`. It uses a temp home unless `--home-dir` or `ISNADI_HOME` is set.
