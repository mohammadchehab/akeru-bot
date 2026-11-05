import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeFSP from "node:fs/promises";
import * as Effect from "effect/Effect";

import { createLocalEmbeddingProvider } from "./LocalEmbeddingProvider.ts";

const sentences = {
  english: ["The cat sat on the warm windowsill.", "A kitten rested on the sunny ledge."],
  arabic: ["القط جلس على حافة النافذة الدافئة.", "استراح الهر الصغير على الإفريز المشمس."],
  other: ["Quarterly revenue grew by twelve percent."],
};

const cosine = (a: Float32Array, b: Float32Array) => a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);

const homeArg = process.argv.indexOf("--home-dir");

const home =
  (homeArg > 0 ? process.argv[homeArg + 1] : undefined) ??
  process.env.ISNADI_HOME ??
  (await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "isnadi-embed-smoke-")));

const provider = createLocalEmbeddingProvider({ modelsDir: NodePath.join(home, "models") });

const timed = async (label: string, texts: ReadonlyArray<string>) => {
  const started = performance.now();
  const vectors = await Effect.runPromise(provider.embed(texts, "passage"));
  console.log(`${label}: ${texts.length} texts in ${Math.round(performance.now() - started)} ms`);

  return vectors;
};

try {
  console.log(`setupId=${provider.setupId} dims=${provider.dims} home=${home}`);
  const [en1, en2] = await timed("english", sentences.english);
  const [ar1, ar2] = await timed("arabic", sentences.arabic);
  const [other] = await timed("other", sentences.other);

  if (!en1 || !en2 || !ar1 || !ar2 || !other) throw new Error("missing vectors");

  if (en1.length !== provider.dims) throw new Error(`dims ${en1.length} != ${provider.dims}`);

  const checks = [
    ["english same vs different", cosine(en1, en2), cosine(en1, other)],
    ["arabic same vs different", cosine(ar1, ar2), cosine(ar1, other)],
  ] as const;

  for (const [name, same, different] of checks) {
    console.log(`${name}: same=${same.toFixed(3)} different=${different.toFixed(3)}`);

    if (same <= different) throw new Error(`${name}: expected same > different`);
  }

  console.log("ok");
} finally {
  await Effect.runPromise(provider.close());
}
