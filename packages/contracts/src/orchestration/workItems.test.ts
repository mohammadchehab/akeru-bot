import { assert, it } from "@effect/vitest";

import { parseTrackerLink } from "./workItems.ts";

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
