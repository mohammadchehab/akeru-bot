import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { chromium, type Browser, type Page } from "playwright-core";
import { expect } from "vite-plus/test";

import { startStack, type Stack } from "./stack.ts";
import { stubReplyFrom } from "./stubOpenAI.ts";

export const REPLY_TIMEOUT_MS = 30_000;

export const providerReplies = (page: Page) => page.getByTestId("group-provider-message");

/** Creates a bot from the empty roster's button (`first`) or the roster's Create menu. */
export async function createBot(page: Page, name: string, first: boolean) {
  if (first) {
    await page.getByRole("button", { name: "Create bot" }).click();
  } else {
    await page.getByTestId("roster-new-bot").click();
    await page.getByRole("menuitem", { name: "New bot" }).click();
  }

  await page.getByPlaceholder("Name your bot").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

/** Creates a group of the given bots. The first bot picked leads the group. */
export async function createGroup(page: Page, name: string, bots: ReadonlyArray<string>) {
  await page.getByTestId("roster-new-bot").click();
  await page.getByRole("menuitem", { name: "New group" }).click();

  const dialog = page.getByRole("dialog");

  await dialog.getByLabel("Group name").fill(name);

  for (const bot of bots) {
    const box = dialog.getByRole("checkbox", { name: bot });

    await box.focus();
    await box.press("Space");
  }

  await dialog.getByRole("button", { name: "Create group" }).click();
  await dialog.waitFor({ state: "hidden" });
}

/** Leaves a screenshot of a failing step; the path is in the test output. */
export async function screenshotFailure(page: Page, testName: string) {
  const path = NodePath.join(
    process.env.E2E_ARTIFACTS_DIR ?? NodeOS.tmpdir(),
    `isnadi-e2e-${testName.replace(/\W+/g, "-")}.png`,
  );

  await page.screenshot({ path });
  console.error(`Screenshot: ${path}`);
}

export interface Crew {
  readonly stack: Stack;
  readonly browser: Browser;
  readonly page: Page;
  readonly close: () => Promise<void>;
}

/** Starts a stack and a paired browser with the group "Crew": boss Bot1 and member Bot2. */
export async function openCrew(): Promise<Crew> {
  const stack = await startStack();

  const browser = await chromium.launch({
    channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
    headless: process.env.E2E_HEADED !== "1",
  });

  const page = await browser.newPage();

  await page.goto(stack.pairingUrl, { waitUntil: "domcontentloaded" });
  await page.getByText("Create your first bot").waitFor();
  await createBot(page, "Bot1", true);
  await createBot(page, "Bot2", false);
  await createGroup(page, "Crew", ["Bot1", "Bot2"]);

  return {
    stack,
    browser,
    page,
    close: async () => {
      await browser.close();
      await stack.stop();
    },
  };
}

/** Types `text` into the Crew composer and sends it. A typed `@Name` addresses that bot. */
export async function sendToCrew(page: Page, text: string) {
  const composer = page.getByRole("textbox", { name: "Message Crew" });

  await composer.fill(text);
  await composer.press("Enter");
}

/**
 * Sends `text`, waits for one new reply per expected bot, and checks in order who answered: the stub's
 * text names the bot that really ran, and the row's label names who the chat shows. Then it checks that
 * nobody else answered and that each addressed bot ran exactly once.
 */
export async function sendAndExpectReplies(
  crew: Pick<Crew, "stack" | "page">,
  text: string,
  bots: ReadonlyArray<string>,
) {
  const { stack, page } = crew;
  const answered = await providerReplies(page).count();
  const asked = stack.stub.completions.length;

  await sendToCrew(page, text);

  for (const [index, bot] of bots.entries()) {
    const row = providerReplies(page).nth(answered + index);

    await row.getByText(stubReplyFrom(bot)).waitFor({ timeout: REPLY_TIMEOUT_MS });
    await row.getByText(bot, { exact: true }).waitFor({ timeout: 5_000 });
  }

  expect(await providerReplies(page).count()).toBe(answered + bots.length);
  expect(stack.stub.completions.slice(asked).map((completion) => completion.bot)).toEqual(bots);
}
