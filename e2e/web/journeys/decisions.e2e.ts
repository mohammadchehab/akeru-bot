import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";

import { reportFailure, watchPage } from "../support/diagnostics.ts";
import { startStack, type Stack } from "../support/stack.ts";
import { STUB_APPROVAL_MARKER } from "../support/stubOpenAI.ts";

describe("decisions", () => {
  let stack: Stack;
  let browser: Browser;
  let page: Page;
  let seen: () => ReadonlyArray<string>;

  const decisions = () => page.getByTestId("decisions-group");

  const createBot = async (name: string) => {
    await page.getByTestId("roster-new-bot").click();
    await page.getByRole("menuitem", { name: "New bot" }).click();
    await page.getByPlaceholder("Name your bot").fill(name);
    await page.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("textbox", { name: `Message ${name}` }).waitFor();
  };

  const openBot = (name: string) => page.getByRole("button", { name }).first().click();

  beforeAll(async () => {
    stack = await startStack();
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: process.env.E2E_HEADED !== "1",
    });
    page = await browser.newPage();
    seen = watchPage(page);
  });

  beforeEach(() => stack.assertNotRestarted());

  afterEach(async ({ task }) => {
    if (task.result?.state !== "fail") return;

    const path = NodePath.join(
      process.env.E2E_ARTIFACTS_DIR ?? NodeOS.tmpdir(),
      `isnadi-e2e-${task.name.replace(/\W+/g, "-")}.png`,
    );

    await page.screenshot({ path });
    console.error(`Screenshot: ${path}`);
    await reportFailure(page, stack, seen());
  });

  afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  it("starts with nothing waiting", async () => {
    await page.goto(stack.pairingUrl);
    await page.getByText("Create your first bot").waitFor();
    await page.getByRole("button", { name: "Create bot" }).click();
    await page.getByPlaceholder("Name your bot").fill("Alpha");
    await page.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
    await page.getByRole("textbox", { name: "Message Alpha" }).waitFor();
    await createBot("Bravo");

    await decisions().getByText("Nothing waiting on you").waitFor();
  });

  it("lists a chat that waits on an approval while the user is in another chat", async () => {
    await openBot("Alpha");
    const composer = page.getByRole("textbox", { name: "Message Alpha" });

    await composer.fill(`Run something ${STUB_APPROVAL_MARKER}`);
    await composer.press("Enter");
    await openBot("Bravo");
    await page.getByRole("textbox", { name: "Message Bravo" }).waitFor();

    const row = decisions().getByRole("button", { name: /^Approval needed: Alpha/ });

    await row.waitFor();
    expect(await decisions().getByRole("button").count()).toBe(1);
  });

  it("jumps to that chat with its prompt visible, then clears the row on approval", async () => {
    await decisions()
      .getByRole("button", { name: /^Approval needed: Alpha/ })
      .click();

    await page.getByRole("textbox", { name: "Message Alpha" }).waitFor();
    await page.getByLabel("Approval required").waitFor();

    await page
      .getByRole("button", { name: /^(Allow once|Approve)$/ })
      .first()
      .click();

    await decisions().getByText("Nothing waiting on you").waitFor();
  });
});
