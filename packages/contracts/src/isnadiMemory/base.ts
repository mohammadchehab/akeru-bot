import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import {
  BotId,
  IsoDateTime,
  MessageId,
  PositiveInt,
  ThreadId,
  TrimmedNonEmptyString,
} from "../baseSchemas.ts";

export const ISNADI_MEMORY_PACKET_MAX_FACTS = 24;

export const ISNADI_MEMORY_PACKET_MAX_CHARS = 12_000;

export const ISNADI_MEMORY_PACKET_MAX_ESTIMATED_TOKENS = 3_000;

export const ISNADI_MEMORY_FACT_MAX_CHARS = 2_048;

// New facts are capped. Stored revisions and candidates keep the uncapped
// shape so rows written before the cap still decode.
const IsnadiMemoryFactText = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ISNADI_MEMORY_FACT_MAX_CHARS),
);

export const ISNADI_USER_MEMORY_MAX_CHARS = 1_375;

export const ISNADI_BOT_MEMORY_MAX_CHARS = 2_200;

export const ISNADI_GROUP_MEMORY_MAX_CHARS = 2_200;

export const IsnadiMemoryId = TrimmedNonEmptyString.pipe(Schema.brand("IsnadiMemoryId"));

export type IsnadiMemoryId = typeof IsnadiMemoryId.Type;

export const IsnadiMemoryRootId = TrimmedNonEmptyString.pipe(Schema.brand("IsnadiMemoryRootId"));

export type IsnadiMemoryRootId = typeof IsnadiMemoryRootId.Type;

export const IsnadiMemoryCandidateId = TrimmedNonEmptyString.pipe(
  Schema.brand("IsnadiMemoryCandidateId"),
);

export type IsnadiMemoryCandidateId = typeof IsnadiMemoryCandidateId.Type;

export const IsnadiMemoryTenantId = TrimmedNonEmptyString.pipe(
  Schema.brand("IsnadiMemoryTenantId"),
);

export type IsnadiMemoryTenantId = typeof IsnadiMemoryTenantId.Type;

export const IsnadiMemoryUserId = TrimmedNonEmptyString.pipe(Schema.brand("IsnadiMemoryUserId"));

export type IsnadiMemoryUserId = typeof IsnadiMemoryUserId.Type;

export const IsnadiMemoryEntityId = TrimmedNonEmptyString.pipe(
  Schema.brand("IsnadiMemoryEntityId"),
);

export type IsnadiMemoryEntityId = typeof IsnadiMemoryEntityId.Type;

export const IsnadiMemoryPartitionId = TrimmedNonEmptyString.pipe(
  Schema.brand("IsnadiMemoryPartitionId"),
);

export type IsnadiMemoryPartitionId = typeof IsnadiMemoryPartitionId.Type;

export const IsnadiMemoryScope = Schema.Literals([
  "user",
  "bot-user",
  "bot",
  "project",
  "group",
  "workspace",
  "thread",
]);

export type IsnadiMemoryScope = typeof IsnadiMemoryScope.Type;

export const IsnadiMemoryVisibility = Schema.Literals(["private", "shared"]);

export type IsnadiMemoryVisibility = typeof IsnadiMemoryVisibility.Type;

export const IsnadiMemoryApprovalState = Schema.Literals(["pending", "approved", "rejected"]);

export type IsnadiMemoryApprovalState = typeof IsnadiMemoryApprovalState.Type;

export const IsnadiMemoryCandidateStatus = Schema.Literals(["pending", "approved", "rejected"]);

export type IsnadiMemoryCandidateStatus = typeof IsnadiMemoryCandidateStatus.Type;

export const IsnadiMemoryCandidateUpdate = Schema.Struct({
  rootId: IsnadiMemoryRootId,
  expectedRevision: PositiveInt,
});

export type IsnadiMemoryCandidateUpdate = typeof IsnadiMemoryCandidateUpdate.Type;

export const IsnadiMemoryTargetScope = Schema.Literals([
  "private",
  "bot",
  "project",
  "group",
  "workspace",
]);

export type IsnadiMemoryTargetScope = typeof IsnadiMemoryTargetScope.Type;

export const IsnadiMemoryDeletionState = Schema.Literals(["active", "tombstoned", "deleted"]);

export type IsnadiMemoryDeletionState = typeof IsnadiMemoryDeletionState.Type;

export const IsnadiMemoryKind = Schema.Literals([
  "fact",
  "preference",
  "identity",
  "relationship",
  "routine",
  "instruction",
]);

export type IsnadiMemoryKind = typeof IsnadiMemoryKind.Type;

export const IsnadiMemoryEntityKind = Schema.Literals([
  "user",
  "bot",
  "person",
  "project",
  "group",
  "workspace",
  "other",
]);

export type IsnadiMemoryEntityKind = typeof IsnadiMemoryEntityKind.Type;

export const IsnadiMemoryConfidence = Schema.Number.check(
  Schema.isBetween({ minimum: 0, maximum: 1 }),
);

export type IsnadiMemoryConfidence = typeof IsnadiMemoryConfidence.Type;

export const IsnadiMemoryPartition = Schema.Struct({
  tenantId: IsnadiMemoryTenantId,
  scope: IsnadiMemoryScope,
  partitionId: IsnadiMemoryPartitionId,
});

export type IsnadiMemoryPartition = typeof IsnadiMemoryPartition.Type;

export const IsnadiMemoryRevision = Schema.Struct({
  id: IsnadiMemoryId,
  rootId: IsnadiMemoryRootId,
  revision: PositiveInt,
  partition: IsnadiMemoryPartition,
  entityKind: IsnadiMemoryEntityKind,
  entityId: IsnadiMemoryEntityId,
  kind: IsnadiMemoryKind,
  value: Schema.Record(Schema.String, Schema.Unknown),
  fact: TrimmedNonEmptyString,
  sourceThreadId: Schema.NullOr(ThreadId),
  sourceMessageId: Schema.NullOr(MessageId),
  authorBotId: Schema.NullOr(BotId),
  initiatingUserId: IsnadiMemoryUserId,
  createdAt: IsoDateTime,
  confirmedAt: Schema.NullOr(IsoDateTime),
  updatedAt: IsoDateTime,
  confidence: IsnadiMemoryConfidence,
  approvalState: IsnadiMemoryApprovalState,
  supersedesId: Schema.NullOr(IsnadiMemoryId),
  supersededById: Schema.NullOr(IsnadiMemoryId),
  visibility: IsnadiMemoryVisibility,
  deletionState: IsnadiMemoryDeletionState,
  pinned: Schema.Boolean,
  sensitive: Schema.Boolean,
  affectedBotIds: Schema.Array(BotId),
});

export type IsnadiMemoryRevision = typeof IsnadiMemoryRevision.Type;

export const IsnadiMemoryCandidate = Schema.Struct({
  candidateId: IsnadiMemoryCandidateId,
  tenantId: IsnadiMemoryTenantId,
  initiatingUserId: IsnadiMemoryUserId,
  sourceThreadId: ThreadId,
  sourceMessageId: Schema.NullOr(MessageId),
  authorBotId: Schema.NullOr(BotId),
  fact: TrimmedNonEmptyString,
  scope: IsnadiMemoryTargetScope,
  sensitive: Schema.Boolean,
  confidence: IsnadiMemoryConfidence,
  affectedBotIds: Schema.Array(BotId),
  pendingUpdate: Schema.NullOr(IsnadiMemoryCandidateUpdate).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  status: IsnadiMemoryCandidateStatus,
  createdAt: IsoDateTime,
  decidedAt: Schema.NullOr(IsoDateTime),
  decidedMemoryRootId: Schema.NullOr(IsnadiMemoryRootId),
});

export type IsnadiMemoryCandidate = typeof IsnadiMemoryCandidate.Type;

export const IsnadiMemoryCandidateDecision = Schema.Union([
  Schema.Struct({
    candidateId: IsnadiMemoryCandidateId,
    decision: Schema.Literal("approve"),
    fact: Schema.optional(IsnadiMemoryFactText),
    scope: Schema.optional(IsnadiMemoryTargetScope),
  }),
  Schema.Struct({
    candidateId: IsnadiMemoryCandidateId,
    decision: Schema.Literal("reject"),
  }),
]);

export type IsnadiMemoryCandidateDecision = typeof IsnadiMemoryCandidateDecision.Type;

export const IsnadiMemoryDecisionReceipt = Schema.Struct({
  candidateId: IsnadiMemoryCandidateId,
  status: Schema.Literals(["approved", "rejected"]),
  fact: IsnadiMemoryFactText,
  scope: IsnadiMemoryTargetScope,
  affectedBotIds: Schema.Array(BotId),
  memoryRootId: Schema.NullOr(IsnadiMemoryRootId),
  createdAt: IsoDateTime,
});

export type IsnadiMemoryDecisionReceipt = typeof IsnadiMemoryDecisionReceipt.Type;

// Thread activity kinds for shared-memory approvals. A requested activity with
// no resolved activity for the same candidate is a pending approval card.
export const ISNADI_MEMORY_APPROVAL_REQUESTED_ACTIVITY = "memory.approval.requested";

export const ISNADI_MEMORY_APPROVAL_RESOLVED_ACTIVITY = "memory.approval.resolved";

export const IsnadiMemoryApprovalRequest = Schema.Struct({
  candidateId: IsnadiMemoryCandidateId,
  fact: IsnadiMemoryFactText,
  scope: IsnadiMemoryTargetScope,
  sensitive: Schema.Boolean,
  sourceThreadId: ThreadId,
  authorBotId: Schema.NullOr(BotId),
  affectedBotIds: Schema.Array(BotId),
});

export type IsnadiMemoryApprovalRequest = typeof IsnadiMemoryApprovalRequest.Type;
