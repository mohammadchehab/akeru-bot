import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import {
  BotId,
  GroupId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ThreadId,
  TrimmedNonEmptyString,
} from "../baseSchemas.ts";
import { IsnadiMemoryRootId, IsnadiMemoryRevision, IsnadiMemoryCandidate } from "./base.ts";
import { IsnadiMemoryDocumentTarget } from "./documents.ts";

// Scopes a bot may propose through the memory tool. Private and bot-only
// facts belong in the bot's own memory documents.
export const IsnadiMemoryShareScope = Schema.Literals(["project", "group", "workspace"]);

export type IsnadiMemoryShareScope = typeof IsnadiMemoryShareScope.Type;

export const IsnadiMemoryArchiveFile = Schema.Struct({
  path: TrimmedNonEmptyString,
  mediaType: Schema.Literal("text/markdown"),
  sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
  content: Schema.String,
});

export type IsnadiMemoryArchiveFile = typeof IsnadiMemoryArchiveFile.Type;

export const IsnadiMemoryArchiveV1 = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  threadId: ThreadId,
  complete: Schema.Boolean,
  createdAt: IsoDateTime,
  files: Schema.Array(IsnadiMemoryArchiveFile),
  manifestSha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMemoryArchiveV1 = typeof IsnadiMemoryArchiveV1.Type;

export const IsnadiMemoryArchiveTarget = Schema.Literals([
  "thread",
  "bot",
  "project",
  "workspace",
  "all",
]);

export type IsnadiMemoryArchiveTarget = typeof IsnadiMemoryArchiveTarget.Type;

export const IsnadiMemoryArchiveRevision = Schema.Struct({
  revision: IsnadiMemoryRevision,
  sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMemoryArchiveRevision = typeof IsnadiMemoryArchiveRevision.Type;

export const IsnadiMemoryInspectInput = Schema.Struct({ threadId: ThreadId });

export type IsnadiMemoryInspectInput = typeof IsnadiMemoryInspectInput.Type;

export const IsnadiConversationMemoryRecord = Schema.Struct({
  id: TrimmedNonEmptyString,
  generationCount: NonNegativeInt,
  originType: Schema.Literals(["initial", "reflection"]),
  activeObservations: Schema.String,
  bufferedObservations: Schema.String,
  bufferedReflection: Schema.NullOr(Schema.String),
  totalTokensObserved: NonNegativeInt,
  observationTokenCount: NonNegativeInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export type IsnadiConversationMemoryRecord = typeof IsnadiConversationMemoryRecord.Type;

export const IsnadiConversationMemorySnapshot = Schema.Struct({
  current: Schema.NullOr(IsnadiConversationMemoryRecord),
  history: Schema.Array(IsnadiConversationMemoryRecord),
});

export type IsnadiConversationMemorySnapshot = typeof IsnadiConversationMemorySnapshot.Type;

export const IsnadiMarkdownMemoryArchiveDocument = Schema.Struct({
  botId: BotId,
  groupId: Schema.NullOr(GroupId),
  target: IsnadiMemoryDocumentTarget,
  path: TrimmedNonEmptyString,
  content: Schema.String,
  sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMarkdownMemoryArchiveDocument = typeof IsnadiMarkdownMemoryArchiveDocument.Type;

export const IsnadiMarkdownMemoryArchiveV3 = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  anchorThreadId: ThreadId,
  botId: BotId,
  groupId: Schema.NullOr(GroupId),
  createdAt: IsoDateTime,
  documents: Schema.Array(IsnadiMarkdownMemoryArchiveDocument),
  conversation: Schema.Struct({
    snapshot: IsnadiConversationMemorySnapshot,
    sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
  }),
  manifestSha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMarkdownMemoryArchiveV3 = typeof IsnadiMarkdownMemoryArchiveV3.Type;

export const IsnadiMarkdownMemoryExportInput = Schema.Struct({
  threadId: ThreadId,
  target: IsnadiMemoryArchiveTarget.pipe(
    Schema.withDecodingDefault(Effect.succeed("thread" as const)),
  ),
  complete: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
});

export type IsnadiMarkdownMemoryExportInput = typeof IsnadiMarkdownMemoryExportInput.Type;

export const IsnadiMarkdownMemoryImportPreviewInput = Schema.Struct({
  threadId: ThreadId,
  archive: IsnadiMarkdownMemoryArchiveV3,
});

export type IsnadiMarkdownMemoryImportPreviewInput =
  typeof IsnadiMarkdownMemoryImportPreviewInput.Type;

export const IsnadiMarkdownMemoryImportPreviewItem = Schema.Struct({
  target: IsnadiMemoryDocumentTarget,
  classification: Schema.Literals(["new", "changed", "unchanged"]),
  charCount: NonNegativeInt,
  charLimit: PositiveInt,
});

export type IsnadiMarkdownMemoryImportPreviewItem =
  typeof IsnadiMarkdownMemoryImportPreviewItem.Type;

export const IsnadiMarkdownMemoryImportPreview = Schema.Struct({
  previewHash: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
  documents: Schema.Array(IsnadiMarkdownMemoryImportPreviewItem),
  restoresObservations: Schema.Boolean,
});

export type IsnadiMarkdownMemoryImportPreview = typeof IsnadiMarkdownMemoryImportPreview.Type;

export const IsnadiMarkdownMemoryImportApplyInput = Schema.Struct({
  ...IsnadiMarkdownMemoryImportPreviewInput.fields,
  previewHash: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMarkdownMemoryImportApplyInput = typeof IsnadiMarkdownMemoryImportApplyInput.Type;

export const IsnadiMarkdownMemoryImportApplyResult = Schema.Struct({
  changedDocuments: NonNegativeInt,
  restoredObservations: Schema.Boolean,
});

export type IsnadiMarkdownMemoryImportApplyResult =
  typeof IsnadiMarkdownMemoryImportApplyResult.Type;

export const IsnadiMemoryArchiveConversation = Schema.Struct({
  threadId: ThreadId,
  snapshot: IsnadiConversationMemorySnapshot,
  sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMemoryArchiveConversation = typeof IsnadiMemoryArchiveConversation.Type;

export const IsnadiMemoryArchiveV2 = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  anchorThreadId: ThreadId,
  target: IsnadiMemoryArchiveTarget,
  complete: Schema.Boolean,
  createdAt: IsoDateTime,
  files: Schema.Array(IsnadiMemoryArchiveFile),
  revisions: Schema.Array(IsnadiMemoryArchiveRevision),
  conversations: Schema.Array(IsnadiMemoryArchiveConversation),
  manifestSha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
});

export type IsnadiMemoryArchiveV2 = typeof IsnadiMemoryArchiveV2.Type;

export const IsnadiMemorySnapshot = Schema.Struct({
  threadId: ThreadId,
  durable: Schema.Array(IsnadiMemoryRevision),
  histories: Schema.Array(
    Schema.Struct({
      rootId: IsnadiMemoryRootId,
      revisions: Schema.Array(IsnadiMemoryRevision),
    }),
  ),
  pending: Schema.Array(IsnadiMemoryCandidate),
  conversation: IsnadiConversationMemorySnapshot,
});

export type IsnadiMemorySnapshot = typeof IsnadiMemorySnapshot.Type;

export const IsnadiMemoryExportInput = Schema.Struct({
  threadId: ThreadId,
  complete: Schema.Boolean,
  target: IsnadiMemoryArchiveTarget.pipe(
    Schema.withDecodingDefault(Effect.succeed("thread" as const)),
  ),
});

export type IsnadiMemoryExportInput = typeof IsnadiMemoryExportInput.Type;

export const IsnadiMemoryImportClassification = Schema.Literals([
  "new",
  "changed",
  "conflicting",
  "skipped",
]);

export type IsnadiMemoryImportClassification = typeof IsnadiMemoryImportClassification.Type;

export const IsnadiMemoryImportPreviewItem = Schema.Struct({
  rootId: IsnadiMemoryRootId,
  classification: IsnadiMemoryImportClassification,
  reason: TrimmedNonEmptyString,
});

export type IsnadiMemoryImportPreviewItem = typeof IsnadiMemoryImportPreviewItem.Type;

export const IsnadiMemoryImportPreviewInput = Schema.Struct({
  threadId: ThreadId,
  target: IsnadiMemoryArchiveTarget,
  archive: IsnadiMemoryArchiveV2,
});

export type IsnadiMemoryImportPreviewInput = typeof IsnadiMemoryImportPreviewInput.Type;

export const IsnadiMemoryImportPreview = Schema.Struct({
  previewHash: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
  items: Schema.Array(IsnadiMemoryImportPreviewItem),
});

export type IsnadiMemoryImportPreview = typeof IsnadiMemoryImportPreview.Type;

export const IsnadiMemoryImportApplyInput = Schema.Struct({
  ...IsnadiMemoryImportPreviewInput.fields,
  previewHash: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
  resolutions: Schema.Array(
    Schema.Struct({
      rootId: IsnadiMemoryRootId,
      decision: Schema.Literals(["keep-local", "use-archive"]),
    }),
  ).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
});

export type IsnadiMemoryImportApplyInput = typeof IsnadiMemoryImportApplyInput.Type;

export const IsnadiMemoryImportApplyResult = Schema.Struct({
  imported: NonNegativeInt,
  changed: NonNegativeInt,
  skipped: NonNegativeInt,
});

export type IsnadiMemoryImportApplyResult = typeof IsnadiMemoryImportApplyResult.Type;
