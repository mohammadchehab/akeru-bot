import * as Schema from "effect/Schema";
import type * as Effect from "effect/Effect";

export type EmbeddingKind = "query" | "passage";

export class EmbeddingError extends Schema.TaggedErrorClass<EmbeddingError>()("EmbeddingError", {
  reason: Schema.Literals(["download", "integrity", "runtime", "input"]),
  message: Schema.String,
}) {}

/**
 * Turns text into vectors for chat recall. `setupId` names the provider, model, size and
 * revision so vectors from different setups are never compared. `query` and `passage` pick the
 * model's prefix: a search string is embedded as `query`, indexed chat text as `passage`.
 * Vectors come back L2-normalized, so cosine similarity is a dot product.
 */
export interface EmbeddingProvider {
  readonly setupId: string;
  readonly dims: number;
  readonly embed: (
    texts: ReadonlyArray<string>,
    kind: EmbeddingKind,
  ) => Effect.Effect<ReadonlyArray<Float32Array>, EmbeddingError>;
}
