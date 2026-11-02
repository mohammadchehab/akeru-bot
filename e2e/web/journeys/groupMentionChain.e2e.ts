import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";

import {
  REPLY_TIMEOUT_MS,
  openCrew,
  providerReplies,
  screenshotFailure,
  sendAndExpectReplies,
  sendToCrew,
  type Crew,
} from "../support/groupChat.ts";
import { stubReplyFrom } from "../support/stubOpenAI.ts";

// Mention chains in a group with boss Bot1 and member Bot2. The stub scripts each bot's words from a
// `[say:...]` marker in the user's message (`~` stands for `@`), so what a bot says decides who answers next.
describe("group chat mention chains", () => {
  let crew: Crew;

  beforeAll(async () => {
    crew = await openCrew();
  });

  afterEach(async ({ task }) => {
    if (task.result?.state !== "fail") return;

    await screenshotFailure(crew.page, task.name);
    console.error(`Dev runner output tail:\n${crew.stack.output().slice(-6_000)}`);
  });

  afterAll(async () => {
    await crew?.close();
  });

  it("hands the floor to a bot another bot @mentions, and ends when nobody new is mentioned", async () => {
    await sendToCrew(crew.page, "[say:Bot1=~Bot2, please add to that] start");

    // The stub really said it, so a missing second reply is the server's doing.
    await providerReplies(crew.page)
      .first()
      .getByText("@Bot2, please add to that")
      .waitFor({ timeout: REPLY_TIMEOUT_MS });
    await providerReplies(crew.page)
      .nth(1)
      .getByText(stubReplyFrom("Bot2"))
      .waitFor({ timeout: REPLY_TIMEOUT_MS });
  });

  it("does not hand the floor on a mention inside a code span", async () => {
    await sendAndExpectReplies(crew, "[say:Bot1=ask `~Bot2` later] code span", ["Bot1"]);
  });

  it("does not hand the floor on a mention inside a quote", async () => {
    await sendAndExpectReplies(crew, "[say:Bot1=> ~Bot2 said this before] quote", ["Bot1"]);
  });

  it("does not hand the floor on a bot's mention of itself", async () => {
    await sendAndExpectReplies(crew, "[say:Bot1=~Bot1, noted] self", ["Bot1"]);
  });

  it("stops a chain between two bots at the per-chat reply budget, 6 by default", async () => {
    const asked = crew.stack.stub.completions.length;
    const answered = await providerReplies(crew.page).count();

    await sendToCrew(crew.page, "[say:Bot1=~Bot2, your turn;Bot2=~Bot1, your turn] ping pong");
    await providerReplies(crew.page)
      .nth(answered + 5)
      .getByText(stubReplyFrom("Bot2"))
      .waitFor({ timeout: REPLY_TIMEOUT_MS });

    // A follow-up message proves the chain is over: its turn is the very next request to the model.
    await sendAndExpectReplies(crew, "[say:Bot1=done] anything more?", ["Bot1"]);

    const turns = crew.stack.stub.completions.slice(asked).map((completion) => completion.bot);

    expect(turns).toEqual(["Bot1", "Bot2", "Bot1", "Bot2", "Bot1", "Bot2", "Bot1"]);
    expect(await providerReplies(crew.page).count()).toBe(answered + 7);
  });
});
