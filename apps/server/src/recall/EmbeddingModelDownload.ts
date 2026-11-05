import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import { Readable } from "node:stream";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";

import { EmbeddingError } from "./EmbeddingProvider.ts";
import {
  embeddingModelDirName,
  type EmbeddingModelFile,
  type EmbeddingModelManifest,
} from "./EmbeddingModelManifest.ts";

const MODEL_HOST = "huggingface.co";
const MAX_REDIRECTS = 5;
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

type FetchLike = (url: string, init: { readonly redirect: "manual" }) => Promise<Response>;

export const embeddingModelFileUrl = (manifest: EmbeddingModelManifest, file: EmbeddingModelFile) =>
  `https://${MODEL_HOST}/${manifest.repo}/resolve/${manifest.revision}/${file.path}`;

const fail = (reason: EmbeddingError["reason"], message: string) =>
  new EmbeddingError({ reason, message });

const requireHttps = (url: string) => {
  if (new URL(url).protocol !== "https:") {
    throw fail("download", "Model downloads are https only.");
  }
};

/**
 * Hugging Face answers with a redirect to its CDN. Each hop must be https; the sha256 manifest,
 * not the CDN host, is what proves the bytes.
 */
async function fetchPinned(fetchImpl: FetchLike, start: string): Promise<Response> {
  let url = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    requireHttps(url);

    const response = await fetchImpl(url, { redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw fail("download", "Model download redirected without a location.");
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok || !response.body) {
      throw fail("download", `Model download failed with status ${response.status}.`);
    }
    return response;
  }

  throw fail("download", "Model download redirected too many times.");
}

async function hashFile(filePath: string): Promise<string> {
  const hash = NodeCrypto.createHash("sha256");
  for await (const chunk of NodeFS.createReadStream(filePath)) hash.update(chunk);

  return hash.digest("hex");
}

const isMissing = (cause: unknown) =>
  Predicate.hasProperty(cause, "code") && cause.code === "ENOENT";

async function matchesManifest(filePath: string, file: EmbeddingModelFile): Promise<boolean> {
  try {
    const stat = await NodeFSP.stat(filePath);
    if (stat.size !== file.bytes) return false;

    return (await hashFile(filePath)) === file.sha256;
  } catch (cause) {
    if (isMissing(cause)) return false;
    throw cause;
  }
}

async function downloadFile(input: {
  readonly fetchImpl: FetchLike;
  readonly url: string;
  readonly file: EmbeddingModelFile;
  readonly destination: string;
}): Promise<void> {
  const response = await fetchPinned(input.fetchImpl, input.url);
  const partial = `${input.destination}.part`;
  const hash = NodeCrypto.createHash("sha256");
  let received = 0;

  await NodeFSP.mkdir(NodePath.dirname(input.destination), { recursive: true, mode: DIR_MODE });

  const handle = await NodeFSP.open(partial, "w", FILE_MODE);
  try {
    if (!response.body) throw fail("download", "Model download had no body.");

    for await (const chunk of Readable.fromWeb(response.body)) {
      received += chunk.length;
      if (received > input.file.bytes) {
        throw fail("integrity", `${input.file.path} is larger than the manifest allows.`);
      }
      hash.update(chunk);
      await handle.write(chunk);
    }
  } catch (cause) {
    await handle.close();
    await NodeFSP.rm(partial, { force: true });
    throw cause;
  }
  await handle.close();

  if (received !== input.file.bytes || hash.digest("hex") !== input.file.sha256) {
    await NodeFSP.rm(partial, { force: true });
    throw fail("integrity", `${input.file.path} does not match its pinned sha256.`);
  }

  await NodeFSP.rename(partial, input.destination);
}

/**
 * Makes sure every manifest file is on disk and matches its sha256, and returns the model
 * directory. A file that is present but wrong is deleted and fetched again. A download that does
 * not match is deleted and fails. Directories are 0700 and files 0600.
 */
export const ensureEmbeddingModel = (input: {
  readonly manifest: EmbeddingModelManifest;
  readonly modelsDir: string;
  readonly fetch?: FetchLike;
}) =>
  Effect.tryPromise({
    try: async () => {
      const fetchImpl = input.fetch ?? ((url, init) => fetch(url, init));
      const modelDir = NodePath.join(input.modelsDir, embeddingModelDirName(input.manifest));

      await NodeFSP.mkdir(modelDir, { recursive: true, mode: DIR_MODE });
      await NodeFSP.chmod(input.modelsDir, DIR_MODE);
      await NodeFSP.chmod(modelDir, DIR_MODE);

      for (const file of input.manifest.files) {
        const destination = NodePath.join(modelDir, file.path);
        if (await matchesManifest(destination, file)) continue;

        await NodeFSP.rm(destination, { force: true });
        await downloadFile({
          fetchImpl,
          url: embeddingModelFileUrl(input.manifest, file),
          file,
          destination,
        });
        await NodeFSP.chmod(NodePath.dirname(destination), DIR_MODE);
      }

      return modelDir;
    },
    catch: (cause) =>
      cause instanceof EmbeddingError
        ? cause
        : fail("download", cause instanceof Error ? cause.message : "Model download failed."),
  });
