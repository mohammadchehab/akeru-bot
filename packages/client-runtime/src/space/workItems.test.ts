import { describe, expect, it } from "vite-plus/test";
import { workItemColumn } from "./workItems.ts";

describe("workItemColumn", () => {
  it("maps every state to its board column", () => {
    expect(workItemColumn("queued")).toBe("new");
    expect(workItemColumn("assigned")).toBe("new");
    expect(workItemColumn("in-progress")).toBe("in-progress");
    expect(workItemColumn("blocked")).toBe("in-progress");
    expect(workItemColumn("review")).toBe("draft");
    expect(workItemColumn("done")).toBe("done");
    expect(workItemColumn("closed")).toBe("closed");
  });
});
