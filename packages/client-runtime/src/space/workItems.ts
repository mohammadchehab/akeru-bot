import type { WorkItemState } from "@isnadi/contracts";

export type WorkItemColumn = "new" | "in-progress" | "draft" | "done" | "closed";

/** The board column a work item shows in. Blocked items stay in In progress with a badge. */
export function workItemColumn(state: WorkItemState): WorkItemColumn {
  switch (state) {
    case "queued":
    case "assigned":
      return "new";
    case "in-progress":
    case "blocked":
      return "in-progress";
    case "review":
      return "draft";
    case "done":
      return "done";
    case "closed":
      return "closed";
  }
}
