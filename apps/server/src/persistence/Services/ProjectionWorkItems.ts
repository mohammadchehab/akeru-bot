import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type {
  WorkItemCountsInput,
  WorkItemCountsResult,
  WorkItemListInput,
  WorkItemListResult,
  WorkItemReadError,
} from "@isnadi/contracts";

export interface ProjectionWorkItemRepositoryShape {
  /** Finished items, newest first. Open items ride the shell snapshot instead. */
  readonly list: (input: WorkItemListInput) => Effect.Effect<WorkItemListResult, WorkItemReadError>;
  readonly counts: (
    input: WorkItemCountsInput,
  ) => Effect.Effect<WorkItemCountsResult, WorkItemReadError>;
}

export class ProjectionWorkItemRepository extends Context.Service<
  ProjectionWorkItemRepository,
  ProjectionWorkItemRepositoryShape
>()("isnadibot/persistence/Services/ProjectionWorkItems/ProjectionWorkItemRepository") {}
