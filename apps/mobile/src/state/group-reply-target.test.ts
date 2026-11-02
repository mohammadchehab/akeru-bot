import { describe, expect, it } from "vite-plus/test";

import {
  getGroupReplyTarget,
  restoreGroupReplyTargetAfterFailedSend,
  setGroupReplyTarget,
} from "./group-reply-target";

const target = { messageId: "m-1", botId: "bot-1", botName: "Becky", snippet: "Hello" };

describe("group reply target", () => {
  it("holds one target per chat and clears it", () => {
    setGroupReplyTarget("env\nthread-a", target);

    expect(getGroupReplyTarget("env\nthread-a")).toEqual(target);
    expect(getGroupReplyTarget("env\nthread-b")).toBeNull();

    setGroupReplyTarget("env\nthread-a", null);
    expect(getGroupReplyTarget("env\nthread-a")).toBeNull();
  });
});

describe("restoreGroupReplyTargetAfterFailedSend", () => {
  it("puts the chip back only when the failed send was a reply", () => {
    setGroupReplyTarget("env\nthread-c", null);
    restoreGroupReplyTargetAfterFailedSend("env\nthread-c", target, false);
    expect(getGroupReplyTarget("env\nthread-c")).toBeNull();

    restoreGroupReplyTargetAfterFailedSend("env\nthread-c", null, true);
    expect(getGroupReplyTarget("env\nthread-c")).toBeNull();

    restoreGroupReplyTargetAfterFailedSend("env\nthread-c", target, true);
    expect(getGroupReplyTarget("env\nthread-c")).toEqual(target);
    setGroupReplyTarget("env\nthread-c", null);
  });
});
