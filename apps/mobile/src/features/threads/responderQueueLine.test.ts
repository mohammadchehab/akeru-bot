import { describe, expect, it } from "vite-plus/test";

import { responderQueueLine } from "./responderQueueLine";

const bots = [
  { id: "bot-1", name: "Becky" },
  { id: "bot-2", name: "Mika" },
];

function queue(...botIds: string[]) {
  return { entries: botIds.map((botId) => ({ botId })) };
}

describe("responderQueueLine", () => {
  it("names who waits, and is silent when nobody does", () => {
    expect(responderQueueLine(queue("bot-1"), bots)).toBe("Becky is next");
    expect(responderQueueLine(queue("bot-1", "bot-2"), bots)).toBe("Becky, Mika are next");
    expect(responderQueueLine(queue(), bots)).toBeNull();
    expect(responderQueueLine(undefined, bots)).toBeNull();
  });
});
