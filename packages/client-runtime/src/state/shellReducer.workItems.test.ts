import { GroupId, WorkItemId, type WorkItemSummary } from "@isnadi/contracts";
import { describe, expect, it } from "vite-plus/test";
import { applyShellStreamEvent } from "./shellReducer.ts";
import { baseSnapshot } from "./shellReducer.test-support.ts";

const item: WorkItemSummary = {
  id: WorkItemId.make("work-item-1"),
  groupId: GroupId.make("group-1"),
  title: "Ship it",
  briefPreview: "",
  kind: "task",
  state: "queued",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

describe("applyShellStreamEvent", () => {
  describe("work item events", () => {
    it("adds an item, replaces it on the next upsert, then removes it", () => {
      const added = applyShellStreamEvent(baseSnapshot, {
        kind: "work-item-upserted",
        sequence: 1,
        workItem: item,
      });

      expect(added.workItems).toEqual([item]);

      const moved = { ...item, state: "in-progress" as const };

      const replaced = applyShellStreamEvent(added, {
        kind: "work-item-upserted",
        sequence: 2,
        workItem: moved,
      });

      expect(replaced.workItems).toEqual([moved]);

      const removed = applyShellStreamEvent(replaced, {
        kind: "work-item-removed",
        sequence: 3,
        workItemId: item.id,
      });

      expect(removed.workItems).toEqual([]);
      expect(removed.snapshotSequence).toBe(3);
    });
  });
});
