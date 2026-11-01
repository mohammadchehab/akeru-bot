import * as Schema from "effect/Schema";
import {
  BotId,
  GroupId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ThreadId,
  TrimmedNonEmptyString,
} from "../baseSchemas.ts";

export const IsnadiMemoryDocumentTarget = Schema.Literals(["user", "memory", "group"]);

export type IsnadiMemoryDocumentTarget = typeof IsnadiMemoryDocumentTarget.Type;

export const IsnadiMemoryFileOperation = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("add"),
    content: TrimmedNonEmptyString,
  }),
  Schema.Struct({
    action: Schema.Literal("replace"),
    oldText: TrimmedNonEmptyString,
    content: TrimmedNonEmptyString,
  }),
  Schema.Struct({
    action: Schema.Literal("remove"),
    oldText: TrimmedNonEmptyString,
  }),
]);

export type IsnadiMemoryFileOperation = typeof IsnadiMemoryFileOperation.Type;

export const IsnadiMemoryDocument = Schema.Struct({
  target: IsnadiMemoryDocumentTarget,
  content: Schema.String,
  charCount: NonNegativeInt,
  charLimit: PositiveInt,
  updatedAt: Schema.NullOr(IsoDateTime),
});

export type IsnadiMemoryDocument = typeof IsnadiMemoryDocument.Type;

export const IsnadiBotMemorySnapshot = Schema.Struct({
  botId: BotId,
  groupId: Schema.NullOr(GroupId),
  user: IsnadiMemoryDocument,
  memory: IsnadiMemoryDocument,
  group: Schema.NullOr(IsnadiMemoryDocument),
});

export type IsnadiBotMemorySnapshot = typeof IsnadiBotMemorySnapshot.Type;

export const IsnadiMemoryFileMutationInput = Schema.Struct({
  botId: BotId,
  groupId: Schema.NullOr(GroupId),
  groupMemberBotIds: Schema.Array(BotId),
  target: IsnadiMemoryDocumentTarget,
  operations: Schema.Array(IsnadiMemoryFileOperation),
});

export type IsnadiMemoryFileMutationInput = typeof IsnadiMemoryFileMutationInput.Type;

export const IsnadiMemoryFileMutationResult = Schema.Struct({
  document: IsnadiMemoryDocument,
  applied: PositiveInt,
  changed: Schema.Boolean,
});

export type IsnadiMemoryFileMutationResult = typeof IsnadiMemoryFileMutationResult.Type;

export const IsnadiMemoryDocumentsInspectInput = Schema.Struct({ threadId: ThreadId });

export type IsnadiMemoryDocumentsInspectInput = typeof IsnadiMemoryDocumentsInspectInput.Type;

export const IsnadiMemoryDocumentsSnapshot = Schema.Struct({
  ...IsnadiBotMemorySnapshot.fields,
  conversation: Schema.Struct({
    current: Schema.NullOr(
      Schema.Struct({
        generationCount: Schema.Number,
        activeObservations: Schema.String,
        createdAt: IsoDateTime,
        updatedAt: IsoDateTime,
      }),
    ),
    history: Schema.Array(
      Schema.Struct({
        generationCount: Schema.Number,
        activeObservations: Schema.String,
        createdAt: IsoDateTime,
        updatedAt: IsoDateTime,
      }),
    ),
  }),
});

export type IsnadiMemoryDocumentsSnapshot = typeof IsnadiMemoryDocumentsSnapshot.Type;

export const IsnadiMemoryDocumentReplaceInput = Schema.Struct({
  threadId: ThreadId,
  expectedBotId: BotId,
  expectedContent: Schema.String,
  target: IsnadiMemoryDocumentTarget,
  content: Schema.String,
});

export type IsnadiMemoryDocumentReplaceInput = typeof IsnadiMemoryDocumentReplaceInput.Type;

export const IsnadiMemoryObservationsClearInput = Schema.Struct({ threadId: ThreadId });

export type IsnadiMemoryObservationsClearInput = typeof IsnadiMemoryObservationsClearInput.Type;
