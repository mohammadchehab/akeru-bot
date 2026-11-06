import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type {
  WorkItemCountsInput,
  WorkItemCountsResult,
  WorkItemGetError,
  WorkItemGetInput,
  WorkItem,
  WorkItemListInput,
  WorkItemListResult,
  WorkItemReadError,
} from "@isnadi/contracts";

export interface ProjectionWorkItemRepositoryShape {
  /** Finished items, newest first. Open items ride the shell snapshot instead. */
  readonly list: (input: WorkItemListInput) => Effect.Effect<WorkItemListResult, WorkItemReadError>;
  /** One item with its full brief, open or finished. */
  readonly get: (input: WorkItemGetInput) => Effect.Effect<WorkItem, WorkItemGetError>;
  readonly counts: (
    input: WorkItemCountsInput,
  ) => Effect.Effect<WorkItemCountsResult, WorkItemReadError>;
}

export class ProjectionWorkItemRepository extends Context.Service<
  ProjectionWorkItemRepository,
  ProjectionWorkItemRepositoryShape
>()("isnadibot/persistence/Services/ProjectionWorkItems/ProjectionWorkItemRepository") {}
