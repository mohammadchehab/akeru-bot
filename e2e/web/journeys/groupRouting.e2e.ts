import { type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { watchPage } from "../support/diagnostics.ts";
import { journeyReport, launchBrowser } from "../support/journey.ts";
import { startStack, type Stack } from "../support/stack.ts";
import { stubReplyFrom } from "../support/stubOpenAI.ts";

const REPLY_TIMEOUT_MS = 30_000;

// A group with boss Bot1 and member Bot2. A message with no mention goes to the boss
// only; "@Bot2 ..." goes to Bot2 only. There is no broadcast.
describe("group chat routing", () => {
  let stack: Stack;
  let browser: Browser;
  let page: Page;
  let seen: () => ReadonlyArray<string>;

  const replies = () => page.getByTestId("group-provider-message");

  const createBot = async (name: string, first: boolean) => {
    if (first) {
      await page.getByRole("button", { name: "Create bot" }).click();
    } else {
      await page.getByTestId("roster-new-bot").click();
      await page.getByRole("menuitem", { name: "New bot" }).click();
    }

    await page.getByPlaceholder("Name your bot").fill(name);
    await page.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  };

  /** Sends `text` and waits for reply number `count`; returns that reply's row. */
  const send = async (text: string, count: number) => {
    const composer = page.getByRole("textbox", { name: "Message Crew" });

    await composer.fill(text);

    // A message sent while a turn is still running queues behind it. Once there is text the
    // submit button reads "<bot> is working" until the turn ends, then "Send message".
    await page.getByRole("button", { name: "Send message" }).waitFor({ timeout: REPLY_TIMEOUT_MS });
    await composer.press("Enter");

    const row = replies().nth(count - 1);

    await row.waitFor({ timeout: REPLY_TIMEOUT_MS });

    return row;
  };

  /**
   * The row names its responder with a label (the bot's name, alone in its element) and the
   * stub's text names the bot that really answered. Both must agree.
   */
  const expectRepliedBy = async (row: ReturnType<typeof replies>, bot: string, other: string) => {
    await row.getByText(stubReplyFrom(bot)).waitFor({ timeout: REPLY_TIMEOUT_MS });
    await row.getByText(bot, { exact: true }).waitFor({ timeout: 5_000 });

    expect(await row.getByText(other, { exact: true }).count()).toBe(0);
  };

  beforeAll(async () => {
    stack = await startStack();
    browser = await launchBrowser();
    page = await browser.newPage();
    seen = watchPage(page);

    await page.goto(stack.pairingUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Create your first bot").waitFor();
    await createBot("Bot1", true);
    await createBot("Bot2", false);
    await page.getByTestId("roster-new-bot").click();
    await page.getByRole("menuitem", { name: "New group" }).click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Group name").fill("Crew");

    // The first bot picked leads the group.
    for (const name of ["Bot1", "Bot2"]) {
      const box = dialog.getByRole("checkbox", { name });

      await box.focus();
      await box.press("Space");
    }

    await dialog.getByRole("button", { name: "Create group" }).click();
    await dialog.waitFor({ state: "hidden" });
  });

  journeyReport(() => ({ stack, page, seen }));

  afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  it("answers a message with no mention from the boss only, live", async () => {
    const row = await send("hi all", 1);

    await expectRepliedBy(row, "Bot1", "Bot2");
  });

  it("answers an @mention from the mentioned bot only, live", async () => {
    const row = await send("@Bot2 hi", 2);

    await expectRepliedBy(row, "Bot2", "Bot1");
  });

  it("goes back to the boss for the next plain message, live", async () => {
    const row = await send("hi", 3);

    await expectRepliedBy(row, "Bot1", "Bot2");
  });

  it("asked each bot exactly once, in order", () => {
    const turns = stack.stub.completions.filter((completion) =>
      /^(hi all|@Bot2 hi|hi)$/.test(completion.user),
    );

    expect(turns.map((turn) => [turn.bot, turn.user])).toEqual([
      ["Bot1", "hi all"],
      ["Bot2", "@Bot2 hi"],
      ["Bot1", "hi"],
    ]);
  });

  it("shows the same responders after a reload", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await replies().nth(2).waitFor({ timeout: REPLY_TIMEOUT_MS });

    expect(await replies().count()).toBe(3);
    await expectRepliedBy(replies().nth(0), "Bot1", "Bot2");
    await expectRepliedBy(replies().nth(1), "Bot2", "Bot1");
    await expectRepliedBy(replies().nth(2), "Bot1", "Bot2");
  });
});
