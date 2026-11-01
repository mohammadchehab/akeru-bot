import type {
  IsnadiMemoryId,
  IsnadiMemoryMutation,
  IsnadiMemoryRevision,
  IsnadiMemoryRootId,
  IsnadiMemoryTargetScope,
  IsnadiMemoryThreadAccess,
  IsnadiMemoryImportPreview,
  IsnadiMemoryImportApplyResult,
  MessageId,
} from "@isnadi/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { ProjectionRepositoryError } from "../../persistence/Errors.ts";
import type { IsnadiMemoryAccessDenied } from "../EntityMemoryAccess.ts";
import type { AuthorizedMemoryPartition } from "../EntityMemoryAccess.ts";

export class EntityMemoryConflictError extends Schema.TaggedErrorClass<EntityMemoryConflictError>()(
  "EntityMemoryConflictError",
  {
    rootId: Schema.String,
    expectedRevision: Schema.Number,
    actualRevision: Schema.NullOr(Schema.Number),
  },
) {
  override get message(): string {
    return `Memory revision conflict for ${this.rootId}. Expected ${this.expectedRevision}, found ${this.actualRevision ?? "none"}.`;
  }
}

export class EntityMemoryNotFoundError extends Schema.TaggedErrorClass<EntityMemoryNotFoundError>()(
  "EntityMemoryNotFoundError",
  { rootId: Schema.String },
) {
  override get message(): string {
    return `Memory ${this.rootId} does not exist.`;
  }
}

export interface SearchEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly query: string;
  readonly limit: number;
}

export interface GetEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly rootId: IsnadiMemoryRootId;
}

export interface ListEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
}

export interface ListEntityMemoryPartitionsInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly partitions: ReadonlyArray<AuthorizedMemoryPartition>;
  readonly complete: boolean;
}

export interface DeleteEntityMemoryInput extends GetEntityMemoryInput {}

export interface InsertEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly revision: IsnadiMemoryRevision;
}

export interface ReviseEntityMemoryInput extends InsertEntityMemoryInput {
  readonly expectedRevision: number;
}

export interface ApplyEntityMemoryMutationInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly mutation: Extract<IsnadiMemoryMutation, { readonly operation: `fact.${string}` }>;
  readonly memoryId: IsnadiMemoryId;
  readonly updatedAt: string;
  /** Shared-scope policy for a mutation that lands a fact on a shared scope. */
  readonly sharedProjectApproval: "approved" | "pending";
}

// Writes a new approved fact to the partition that backs a target scope for
// the given thread access. Used when a person approves a memory candidate.
export interface InsertScopedEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly scope: IsnadiMemoryTargetScope;
  readonly fact: string;
  readonly sensitive: boolean;
  readonly confidence: number;
  readonly sourceMessageId: MessageId | null;
  readonly memoryId: IsnadiMemoryId;
  readonly createdAt: string;
}

export interface TombstoneEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly rootId: IsnadiMemoryRootId;
  readonly expectedRevision: number;
  readonly memoryId: IsnadiMemoryId;
  readonly updatedAt: string;
}

export interface ImportEntityMemoryInput {
  readonly access: IsnadiMemoryThreadAccess;
  readonly partitions: ReadonlyArray<AuthorizedMemoryPartition>;
  readonly revisions: ReadonlyArray<IsnadiMemoryRevision>;
}

export interface ApplyEntityMemoryImportInput extends ImportEntityMemoryInput {
  readonly previewHash: string;
  readonly resolutions?: ReadonlyArray<{
    readonly rootId: IsnadiMemoryRootId;
    readonly decision: "keep-local" | "use-archive";
  }>;
}

export class EntityMemoryImportError extends Schema.TaggedErrorClass<EntityMemoryImportError>()(
  "EntityMemoryImportError",
  { detail: Schema.String },
) {
  override get message(): string {
    return this.detail;
  }
}

export type EntityMemoryRepositoryError =
  | ProjectionRepositoryError
  | IsnadiMemoryAccessDenied
  | EntityMemoryConflictError
  | EntityMemoryNotFoundError
  | EntityMemoryImportError;

export interface EntityMemoryRepositoryShape {
  readonly recordDerivedCopies?: (input: {
    readonly tenantId: string;
    readonly threadId: string;
    readonly revisions: ReadonlyArray<IsnadiMemoryRevision>;
  }) => Effect.Effect<void, EntityMemoryRepositoryError>;
  readonly insert: (
    input: InsertEntityMemoryInput,
  ) => Effect.Effect<IsnadiMemoryRevision, EntityMemoryRepositoryError>;
  readonly revise: (
    input: ReviseEntityMemoryInput,
  ) => Effect.Effect<IsnadiMemoryRevision, EntityMemoryRepositoryError>;
  readonly tombstone: (
    input: TombstoneEntityMemoryInput,
  ) => Effect.Effect<IsnadiMemoryRevision, EntityMemoryRepositoryError>;
  readonly getCurrent: (
    input: GetEntityMemoryInput,
  ) => Effect.Effect<IsnadiMemoryRevision, EntityMemoryRepositoryError>;
  readonly search: (
    input: SearchEntityMemoryInput,
  ) => Effect.Effect<ReadonlyArray<IsnadiMemoryRevision>, EntityMemoryRepositoryError>;
  readonly listCurrent: (
    input: ListEntityMemoryInput,
  ) => Effect.Effect<ReadonlyArray<IsnadiMemoryRevision>, EntityMemoryRepositoryError>;
  readonly listHistory: (
    input: GetEntityMemoryInput,
  ) => Effect.Effect<ReadonlyArray<IsnadiMemoryRevision>, EntityMemoryRepositoryError>;
  readonly listByPartitions: (
    input: ListEntityMemoryPartitionsInput,
  ) => Effect.Effect<ReadonlyArray<IsnadiMemoryRevision>, EntityMemoryRepositoryError>;
  readonly previewImport: (
    input: ImportEntityMemoryInput,
  ) => Effect.Effect<IsnadiMemoryImportPreview, EntityMemoryRepositoryError>;
  readonly applyImport: (
    input: ApplyEntityMemoryImportInput,
  ) => Effect.Effect<IsnadiMemoryImportApplyResult, EntityMemoryRepositoryError>;
  readonly deleteRoot: (
    input: DeleteEntityMemoryInput,
  ) => Effect.Effect<void, EntityMemoryRepositoryError>;
  readonly insertScopedFact: (
    input: InsertScopedEntityMemoryInput,
  ) => Effect.Effect<IsnadiMemoryRevision, EntityMemoryRepositoryError>;
  readonly applyMutation: (
    input: ApplyEntityMemoryMutationInput,
  ) => Effect.Effect<IsnadiMemoryRevision | null, EntityMemoryRepositoryError>;
}

export class EntityMemoryRepository extends Context.Service<
  EntityMemoryRepository,
  EntityMemoryRepositoryShape
>()("isnadibot/memory/Services/EntityMemoryRepository") {}
