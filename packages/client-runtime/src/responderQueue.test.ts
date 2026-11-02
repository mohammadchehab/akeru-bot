import { describe, expect, it } from "vite-plus/test";

import { responderQueueLine, responderQueueNames } from "./responderQueue";

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
