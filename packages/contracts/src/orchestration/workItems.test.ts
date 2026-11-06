import { assert, it } from "@effect/vitest";

import {
  briefPreview,
  toWorkItemSummary,
  WORK_ITEM_PREVIEW_LIMIT,
  WorkItemId,
  parseTrackerLink,
  type WorkItem,
} from "./workItems.ts";

it("parses a GitHub issue URL", () => {
  assert.deepStrictEqual(parseTrackerLink("https://github.com/acme/app/issues/12"), {
    kind: "github",
    ref: "https://github.com/acme/app/issues/12",
  });
});

it("parses a GitHub pull request URL", () => {
  assert.deepStrictEqual(parseTrackerLink("https://github.com/acme/app/pull/7"), {
    kind: "github",
    ref: "https://github.com/acme/app/pull/7",
  });
});

it("parses a Jira key", () => {
  assert.deepStrictEqual(parseTrackerLink("ABC-123"), {
    kind: "jira",
    ref: "ABC-123",
  });
});

it("parses another https URL", () => {
  assert.deepStrictEqual(parseTrackerLink("https://linear.app/acme/issue/ENG-1"), {
    kind: "url",
    ref: "https://linear.app/acme/issue/ENG-1",
  });
});

it("refuses http, javascript and userinfo URLs and junk", () => {
  for (const value of [
    "http://github.com/acme/app/issues/1",
    "javascript:alert(1)",
    "https://user:pw@example.com/x",
    "https://user@example.com/x",
    "abc-123",
    "A-1",
    "not a link",
    "",
  ]) {
    assert.isNull(parseTrackerLink(value), value);
  }
});

it("keeps a short brief as is", () => {
  assert.strictEqual(briefPreview("Fix the login redirect."), "Fix the login redirect.");
});

it("cuts a long brief at a word boundary with an ellipsis", () => {
  const preview = briefPreview("word ".repeat(200));

  assert.isAtMost(preview.length, WORK_ITEM_PREVIEW_LIMIT);
  assert.isTrue(preview.endsWith("word…"));
});

it("cuts a brief with no spaces at the limit", () => {
  const preview = briefPreview("x".repeat(1000));

  assert.strictEqual(preview.length, WORK_ITEM_PREVIEW_LIMIT);
  assert.isTrue(preview.endsWith("…"));
});

it("summarises an item without its brief", () => {
  const item: WorkItem = {
    id: WorkItemId.make("work-item-1"),
    groupId: "group-1" as WorkItem["groupId"],
    title: "Ship it",
    brief: "y ".repeat(4000),
    kind: "task",
    state: "queued",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const summary = toWorkItemSummary(item);

  assert.notProperty(summary, "brief");
  assert.isAtMost(summary.briefPreview.length, WORK_ITEM_PREVIEW_LIMIT);
});
