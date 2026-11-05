# Chat recall

> For maintainers. Design for embeddings and vector recall over past chats (E11: S1101–S1104).
> Using IsnadiBot? See [docs/user](../user/).

Bots and the owner can search every past chat and ground answers in it. Recall is hybrid: the existing
FTS5 keyword index plus vectors, merged and reranked. By default a small local model computes the
vectors, so no chat text leaves the environment. An embeddings API on an existing Custom API instance is
optional.

## Goal

- Chats are embedded by a local model on the server by default. Nothing is sent to a third party unless
  the owner turns on an API provider and confirms a disclosure.
- A vector hit passes the same access check as a keyword hit before it is scored, so recall never crosses
  bots, groups or owners the reader cannot read.
- Secrets never reach the index or a provider. Sensitive threads are excluded, and every chunk is
  redacted before any embed call.
- Deleting a chat deletes its vectors. Switching model or provider re-embeds, and the owner can drop the
  old vectors.

## Where it runs

Embedding runs only in the server process, for both indexing and queries. It never runs in the desktop
renderer, web or mobile. The server already owns threads and providers ([remote](remote.md)), so these
setups all behave the same:

- the desktop app's bundled local server;
- an `npx` server;
- a remote server reached over Tailscale.

Web and mobile search works because the query is embedded on the server too. "Nothing leaves this
computer" in the settings copy means nothing leaves the machine that runs the server, which is why the
setting reads "On this environment".

## Runtime and model

- **Runtime.** `@huggingface/transformers` (transformers.js v3) on `onnxruntime-node`, which ships
  prebuilt N-API binaries for darwin arm64/x64, linux x64/arm64 and win x64. No Python, no daemon.
  - It runs in a `node:worker_threads` worker with intra-op threads capped at 2, so turns and the event
    loop stay responsive.
  - The worker starts on the first index or query and stops after an idle period.
- **Model.** The model must be multilingual, because Arabic ships.

  | Model                                   | Size (int8) | Dims          | Licence | Role                      |
  | --------------------------------------- | ----------- | ------------- | ------- | ------------------------- |
  | `intfloat/multilingual-e5-small`        | ~118 MB     | 384           | MIT     | Default until the bench   |
  | `onnx-community/embeddinggemma-300m`    | ~300 MB     | 768 (MRL 384) | Gemma   | Challenger, never bundled |
  | `paraphrase-multilingual-MiniLM-L12-v2` | ~118 MB     | 384           | Apache  | Challenger                |

  The bench picks the default. e5 needs the `query: ` and `passage: ` prefixes, and the provider adds
  them.

  Rejected:

  - English-only models (bge-small, all-MiniLM): no Arabic.
  - bge-m3 (2.2 GB) and Qwen3-Embedding-0.6B: too large for a default download.
  - Ollama: an extra daemon.
  - node-llama-cpp: kept as the fallback only if ONNX fails on a target.

- **Download.**
  - The server fetches model files itself, over https, from a pinned commit URL
    (`https://huggingface.co/<repo>/resolve/<commit-sha>/<file>`).
  - Each file is checked against a sha256 manifest in the repo. A mismatch deletes the file and fails.
  - Files land in `$ISNADI_HOME/models/<model>@<sha>/` (directories 0700, files 0600).
  - transformers.js runs with `allowRemoteModels = false` and `localModelPath` set, so it never fetches
    anything on its own.
  - Nothing ships in the installer. The download happens when recall is first enabled, with progress
    shown.

## Providers

```ts
interface EmbeddingProvider {
  readonly setupId: string; // `${kind}:${model}:${dims}:${revision}`
  readonly dims: number;
  embed(
    texts: ReadonlyArray<string>,
    kind: "query" | "passage",
  ): Effect<Float32Array[], EmbeddingError>;
}
```

- **`local`**: the worker described above.
- **`openai-compatible`**: points at an existing Custom API instance (`CustomOpenaiDriver`).
  - It reuses that instance's base URL and its key from the secret store, so there is no new key field.
  - It adds an embedding model name and calls `POST ${baseUrl}/embeddings`.
  - The URL must be https. Requests are pinned to the instance's exact origin and redirects are not
    followed.
  - The key and request bodies are kept out of errors, logs, settings and exports.
  - Batches are capped, with backoff on 429.
  - The server refuses to send anything unless the settings record `acknowledgedEgress: true` for that
    instance. The UI sets it only after a confirm that names the origin and says every indexed chat is
    sent there.

Settings:

```ts
settings.memory.recall = {
  enabled: boolean, // default true
  provider:
    | { kind: "local"; model: string }
    | { kind: "openai-compatible"; instanceId: string; model: string; acknowledgedEgress: boolean },
}
```

[Memory](memory.md) is amended when the settings land (S1101e).

## Storage

Vectors are BLOBs in the existing server SQLite database, and search is a brute-force cosine in the
worker. We do not use sqlite-vec, because extension loading differs across `node:sqlite`
(`allowExtension`), Bun with the macOS system SQLite (extensions blocked) and Electron. About 100k
chunks × 384 dims scores in tens of milliseconds. Storage sits behind a `VectorIndex` interface, so
sqlite-vec or libsql vectors can replace it when the data outgrows brute force; the bench will show
where that line is.

Migration 078:

```
recall_setups      setup_id PK, provider_kind, model, dims, revision,
                   status ('active' | 'building' | 'retired'), created_at
recall_chunks      chunk_id PK, thread_id, message_id, turn_id NULL, chunk_index, text_hash, created_at
                   index (thread_id), index (message_id)
recall_embeddings  chunk_id, setup_id, vector BLOB, PRIMARY KEY (chunk_id, setup_id)
projection_threads + recall_excluded INTEGER NOT NULL DEFAULT 0
```

- Chunk text is not stored twice. Search reads it from `projection_thread_messages`, so deleting a
  message removes the only copy. An edited message is re-chunked when its `text_hash` changes.
- `ThreadDeletionReactor` deletes a thread's chunks and embeddings.
- The vectors are left out of [data portability](data-portability.md) exports and snapshots. An export
  of the index would need the access filter to travel with it, which is out of scope.

## Access

Access control is never copied into vector rows. A search proceeds in this order:

1. Resolve the reader's candidate threads from `projection_threads`:
   - `deleted_at IS NULL` and `recall_excluded = 0`;
   - the recall scope for that reader (S1104: every chat, the bot's spaces, or the bot's own chats),
     matched on `bot_id`, `group_id` and `project_id`.
2. Score only chunks whose `thread_id` is in that set. A chunk the reader cannot read is never scored,
   so it cannot leak through ranking.
3. Merge with the FTS5 hits under the same candidate set and rerank (S1103).

## Exclusion and redaction

A thread is never chunked, embedded or sent to a provider when any of these hold:

- `recall_excluded = 1` (marked sensitive);
- it holds a `request_secret` exchange;
- it holds browser-auth or signed-in-site content;
- the bot's settings exclude it.

Before any embed call, local included, a redactor runs on each chunk. It reuses the credential and PII
scanners from `BotMemoryStore` and the secret patterns from environment auth, and replaces each hit with
`[redacted]`. A chunk still flagged after redaction is dropped. Marking a thread sensitive sets
`recall_excluded` and deletes its existing chunks and embeddings.

## Switching setups

1. Changing the provider or model creates a `recall_setups` row with status `building`.
2. The backfill (S1102) re-embeds into the new setup while search keeps using the `active` one.
3. When the backfill finishes, the new setup becomes `active` and the old one `retired`.
4. Settings then offer **Delete vectors held for the old setup**, which drops the retired rows.

## Bench

`pnpm --filter server bench:recall` runs on the owner's database, locally or on the dev box. It reads
chats locally and writes only aggregate numbers, never chat text.

- **Pairs.** For each thread with at least 4 messages, the query is a held-out user message or the
  thread title, and the target is that thread's other chunks. Arabic and English are scored separately,
  with at least 200 pairs each when the data allows.
- **Metrics:**
  - recall@5, recall@10 and MRR for FTS5 only, vector only, and hybrid (RRF);
  - embed throughput in chunks per second, on Apple Silicon and on a Linux CPU;
  - query p50 and p95 at 10k and 100k chunks (padded synthetically for scale);
  - peak worker RSS, model size on disk, and vector storage per 10k chunks.
- **Pass bar:**
  - hybrid beats FTS5 alone on recall@10 in both languages;
  - query p95 is under 150 ms at 100k chunks on the Linux box;
  - the default is the smallest model within 2 points of the best recall@10.

Results are recorded below once the bench runs (S1101c).

## Testing

- Provider: embeddings have the right dims, and a cosine sanity check passes (a paraphrase scores above
  an unrelated sentence) in English and Arabic. A hash mismatch fails the download. The event loop is not
  blocked while the worker embeds.
- `VectorIndex`: a chunk outside the candidate set is never returned. Thread deletion empties both
  tables.
- Redaction: table tests cover keys, tokens, emails, phone numbers and Arabic text, and an excluded
  thread is never passed to `embed`.
- API provider: plain http is refused, a redirect is refused, the key never appears in an error, and
  nothing is sent without `acknowledgedEgress`.
- Export: the export contains no `recall_*` rows.

## Slices

Each slice is one PR and leaves main shippable.

| Slice | Card    | What                                                                     | After      |
| ----- | ------- | ------------------------------------------------------------------------ | ---------- |
| 1a    | 74.1    | `EmbeddingProvider`, local worker, pinned and hashed download, smoke CLI | —          |
| 1b    | 74.2    | Migration 078, `VectorIndex`, delete with the thread, export exclusion   | —          |
| 1c    | 74.3    | Bench, results in this doc, default model chosen                         | 1a, 1b     |
| 1d    | 74.4    | openai-compatible provider over a Custom API instance                    | 1a         |
| 1e    | 74.5    | Recall settings, Privacy › Chat recall, egress confirm, setup switch     | 1a, 1d     |
| 1f    | 74.6    | Exclusion, redaction, `recall_excluded`                                  | 1b         |
| 2     | TASK-75 | Chunking reactor and backfill                                            | 1a, 1b, 1f |
| 3     | TASK-76 | Hybrid recall and the search palette                                     | 2          |
| 4     | TASK-77 | Per-bot recall scope                                                     | 3          |

## Open questions

- At what chunk count `VectorIndex` should move to sqlite-vec or libsql vectors. The bench gives the
  numbers.
- Whether EmbeddingGemma's licence is acceptable if it wins the bench. It is downloaded at runtime and
  never redistributed.
