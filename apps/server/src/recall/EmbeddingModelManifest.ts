export interface EmbeddingModelFile {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface EmbeddingModelManifest {
  readonly name: string;
  readonly repo: string;
  /** Hugging Face commit SHA. Files are fetched from this revision only, never from a branch. */
  readonly revision: string;
  readonly dims: number;
  readonly prefixes: { readonly query: string; readonly passage: string };
  readonly files: ReadonlyArray<EmbeddingModelFile>;
}

/**
 * The default local model until the recall bench (TASK-74.3) picks one. Xenova's ONNX export of
 * intfloat/multilingual-e5-small (MIT), int8 weights, 384 dims, Arabic included. To bump it,
 * change `revision` and regenerate every hash from that revision.
 */
export const MULTILINGUAL_E5_SMALL: EmbeddingModelManifest = {
  name: "multilingual-e5-small",
  repo: "Xenova/multilingual-e5-small",
  revision: "761b726dd34fb83930e26aab4e9ac3899aa1fa78",
  dims: 384,
  prefixes: { query: "query: ", passage: "passage: " },
  files: [
    {
      path: "config.json",
      sha256: "cb99455288675345e1a4f411438d5d0adbba5fbd3a67ea4fb03c015433b996c1",
      bytes: 658,
    },
    {
      path: "special_tokens_map.json",
      sha256: "d05497f1da52c5e09554c0cd874037a083e1dc1b9cfd48034d1c717f1afc07a7",
      bytes: 167,
    },
    {
      path: "tokenizer_config.json",
      sha256: "a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b",
      bytes: 443,
    },
    {
      path: "tokenizer.json",
      sha256: "0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39",
      bytes: 17082730,
    },
    {
      path: "onnx/model_quantized.onnx",
      sha256: "f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193",
      bytes: 118308185,
    },
  ],
};

export const embeddingModelDirName = (manifest: EmbeddingModelManifest) =>
  `${manifest.name}@${manifest.revision}`;
