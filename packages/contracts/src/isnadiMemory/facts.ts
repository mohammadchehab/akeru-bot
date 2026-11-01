import * as Schema from "effect/Schema";
import {
  BotId,
  GroupId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "../baseSchemas.ts";
import {
  ISNADI_MEMORY_PACKET_MAX_FACTS,
  ISNADI_MEMORY_PACKET_MAX_CHARS,
  ISNADI_MEMORY_PACKET_MAX_ESTIMATED_TOKENS,
  IsnadiMemoryRootId,
  IsnadiMemoryTenantId,
  IsnadiMemoryUserId,
  IsnadiMemoryScope,
  IsnadiMemoryApprovalState,
  IsnadiMemoryTargetScope,
  IsnadiMemoryDeletionState,
  IsnadiMemoryKind,
  IsnadiMemoryConfidence,
  IsnadiMemoryRevision,
  IsnadiMemoryCandidateDecision,
  IsnadiMemoryDecisionReceipt,
} from "./base.ts";
import { IsnadiMemoryArchiveTarget } from "./transfer.ts";

export const IsnadiMemoryMutation = Schema.Union([
  Schema.Struct({
    operation: Schema.Literal("candidate.decide"),
    decision: IsnadiMemoryCandidateDecision,
  }),
  Schema.Struct({
    operation: Schema.Literal("fact.edit"),
    memoryId: IsnadiMemoryRootId,
    expectedRevision: PositiveInt,
    fact: TrimmedNonEmptyString,
  }),
  Schema.Struct({
    operation: Schema.Literal("fact.pin"),
    memoryId: IsnadiMemoryRootId,
    expectedRevision: PositiveInt,
    pinned: Schema.Boolean,
  }),
  Schema.Struct({
    operation: Schema.Literal("fact.scope"),
    memoryId: IsnadiMemoryRootId,
    expectedRevision: PositiveInt,
    scope: IsnadiMemoryTargetScope,
  }),
  Schema.Struct({
    operation: Schema.Literal("fact.decide"),
    memoryId: IsnadiMemoryRootId,
    expectedRevision: PositiveInt,
    decision: Schema.Literals(["approve", "reject"]),
  }),
  Schema.Struct({
    operation: Schema.Literal("fact.forget"),
    memoryId: IsnadiMemoryRootId,
    expectedRevision: PositiveInt,
  }),
  Schema.Struct({
    operation: Schema.Literal("fact.delete"),
    memoryId: IsnadiMemoryRootId,
    expectedRevision: PositiveInt,
  }),
  Schema.Struct({ operation: Schema.Literal("conversation.clear") }),
]);

export type IsnadiMemoryMutation = typeof IsnadiMemoryMutation.Type;

export const IsnadiMemoryMutateInput = Schema.Struct({
  threadId: ThreadId,
  mutation: IsnadiMemoryMutation,
});

export type IsnadiMemoryMutateInput = typeof IsnadiMemoryMutateInput.Type;

export const IsnadiMemoryMutationResult = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("candidate"), receipt: IsnadiMemoryDecisionReceipt }),
  Schema.Struct({ kind: Schema.Literal("revision"), revision: IsnadiMemoryRevision }),
  Schema.Struct({ kind: Schema.Literal("deleted"), memoryId: IsnadiMemoryRootId }),
  Schema.Struct({ kind: Schema.Literal("conversation-cleared") }),
]);

export type IsnadiMemoryMutationResult = typeof IsnadiMemoryMutationResult.Type;

export const IsnadiMemoryFactsListInput = Schema.Struct({
  threadId: ThreadId,
  target: IsnadiMemoryArchiveTarget,
});

export type IsnadiMemoryFactsListInput = typeof IsnadiMemoryFactsListInput.Type;

export const IsnadiMemoryFactRead = Schema.Struct({
  rootId: IsnadiMemoryRootId,
  fact: TrimmedNonEmptyString,
  scope: IsnadiMemoryScope,
  sourceThreadId: Schema.NullOr(ThreadId),
  affectedBotIds: Schema.Array(BotId),
  approvalState: IsnadiMemoryApprovalState,
  deletionState: IsnadiMemoryDeletionState,
  pinned: Schema.Boolean,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  revision: PositiveInt,
  supersededFact: Schema.NullOr(Schema.String),
});

export type IsnadiMemoryFactRead = typeof IsnadiMemoryFactRead.Type;

export const IsnadiMemoryFactsListResult = Schema.Struct({
  facts: Schema.Array(IsnadiMemoryFactRead),
});

export type IsnadiMemoryFactsListResult = typeof IsnadiMemoryFactsListResult.Type;

export class IsnadiMemoryOperationError extends Schema.TaggedErrorClass<IsnadiMemoryOperationError>()(
  "IsnadiMemoryOperationError",
  { operation: TrimmedNonEmptyString, detail: TrimmedNonEmptyString },
) {}

export const IsnadiMemoryPacketFact = Schema.Struct({
  memoryId: IsnadiMemoryRootId,
  expectedRevision: PositiveInt,
  scope: IsnadiMemoryScope,
  kind: IsnadiMemoryKind,
  fact: TrimmedNonEmptyString,
  pinned: Schema.Boolean,
  confidence: IsnadiMemoryConfidence,
  updatedAt: IsoDateTime,
});

export type IsnadiMemoryPacketFact = typeof IsnadiMemoryPacketFact.Type;

export const IsnadiMemoryPacket = Schema.Struct({
  threadId: ThreadId,
  facts: Schema.Array(IsnadiMemoryPacketFact).check(
    Schema.isMaxLength(ISNADI_MEMORY_PACKET_MAX_FACTS),
  ),
  estimatedTokens: NonNegativeInt.check(
    Schema.isLessThanOrEqualTo(ISNADI_MEMORY_PACKET_MAX_ESTIMATED_TOKENS),
  ),
  rendered: Schema.String.check(Schema.isMaxLength(ISNADI_MEMORY_PACKET_MAX_CHARS)),
});

export type IsnadiMemoryPacket = typeof IsnadiMemoryPacket.Type;

export const IsnadiMemoryThreadAccess = Schema.Struct({
  tenantId: IsnadiMemoryTenantId,
  userId: IsnadiMemoryUserId,
  threadId: ThreadId,
  projectId: ProjectId,
  workspaceRoot: TrimmedNonEmptyString,
  legacyWorkspaceOwnerProjectId: Schema.optional(ProjectId),
  botId: Schema.NullOr(BotId),
  groupId: Schema.NullOr(GroupId),
  respondingBotId: Schema.NullOr(BotId),
  groupMemberBotIds: Schema.Array(BotId),
});

export type IsnadiMemoryThreadAccess = typeof IsnadiMemoryThreadAccess.Type;
