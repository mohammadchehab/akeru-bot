import { type Browser, type Page } from "playwright-core";

import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { watchPage } from "../support/diagnostics.ts";
import { journeyReport, launchBrowser } from "../support/journey.ts";
import { startStack, type Stack } from "../support/stack.ts";
import { stubReplyFrom } from "../support/stubOpenAI.ts";

describe("web chat", () => {
  let stack: Stack;
  let browser: Browser;
  let page: Page;
  let seen: () => ReadonlyArray<string>;

  // The sidebar previews the latest message, so assertions stay inside the chat.
  const conversation = () => page.getByRole("main");

  beforeAll(async () => {
    stack = await startStack();
    browser = await launchBrowser();
    page = await browser.newPage();
    seen = watchPage(page);
  });

  journeyReport(() => ({ stack, page: page, seen }));

  afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  it("pairs a fresh browser and lands on the empty roster", async () => {
    await page.goto(stack.pairingUrl);

    await page.getByText("Create your first bot").waitFor();
    expect(new URL(page.url()).pathname).not.toBe("/pair");
  });

  it("creates a bot and opens its chat", async () => {
    await page.getByRole("button", { name: "Create bot" }).click();
    await page.getByPlaceholder("Name your bot").fill("Echo");
    await page.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();

    await page.waitForURL(/\/bots\//);
    await page.getByRole("textbox", { name: "Message Echo" }).waitFor();
  });

  it("sends a message and shows the reply", async () => {
    const composer = page.getByRole("textbox", { name: "Message Echo" });

    await composer.fill("Hello from the e2e journey");
    await composer.press("Enter");

    await conversation().getByText("Hello from the e2e journey").waitFor();
    await conversation().getByText(stubReplyFrom("Echo")).waitFor();
  });

  it("keeps the conversation after a reload", async () => {
    await page.reload();

    await conversation().getByText(stubReplyFrom("Echo")).waitFor();
  });
});
