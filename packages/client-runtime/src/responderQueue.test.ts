import { describe, expect, it } from "vite-plus/test";

import { responderQueueLine, responderQueueNames, stopTarget } from "./responderQueue.ts";

const members = [
  { id: "bot-1", name: "Becky" },
  { id: "bot-2", name: "Omar" },
];

const queue = (...botIds: string[]) => ({ entries: botIds.map((botId) => ({ botId })) });

const t = (message: string, params?: Readonly<Record<string, string | number>>) =>
  message.replace("{names}", String(params?.names));

describe("responderQueueNames", () => {
  it("lists the waiting members in queue order and skips unknown bots", () => {
    expect(responderQueueNames(queue("bot-2", "bot-9", "bot-1"), members)).toEqual([
      "Omar",
      "Becky",
    ]);
    expect(responderQueueNames(null, members)).toEqual([]);
  });
});

describe("responderQueueLine", () => {
  it("names who waits, and is silent when nobody does", () => {
    expect(responderQueueLine(["Becky"], t)).toBe("Becky is next");
    expect(responderQueueLine(["Becky", "Omar"], t)).toBe("Becky, Omar are next");
    expect(responderQueueLine([], t)).toBeNull();
  });
});

describe("stopTarget", () => {
  it("targets the running turn", () => {
    expect(stopTarget({ session: { status: "running", activeTurnId: "turn-1" } })).toEqual({
      turnId: "turn-1",
    });
    expect(stopTarget({ session: { status: "starting" } })).toEqual({});
  });

  it("still stops between hops, without a turn id", () => {
    expect(
      stopTarget({
        session: { status: "ready", activeTurnId: "turn-1" },
        responderQueue: { entries: [{}] },
      }),
    ).toEqual({});
  });

  it("is null when nothing runs and nobody waits", () => {
    expect(
      stopTarget({ session: { status: "ready" }, responderQueue: { entries: [] } }),
    ).toBeNull();
    expect(stopTarget({})).toBeNull();
  });
});
