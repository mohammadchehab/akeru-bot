import { chromium, type Browser, type Page } from "playwright-core";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";

import { startStack, type Stack } from "../support/stack.ts";
import { STUB_REPLY } from "../support/stubOpenAI.ts";

describe("web chat", () => {
  let stack: Stack;
  let browser: Browser;
  let page: Page;

  // The sidebar previews the latest message, so assertions stay inside the chat.
  const conversation = () => page.getByRole("main");

  beforeAll(async () => {
    stack = await startStack();
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: process.env.E2E_HEADED !== "1",
    });
    page = await browser.newPage();
  });

  // A failing step leaves a screenshot behind; the path is in the test output.
  afterEach(async ({ task }) => {
    if (task.result?.state !== "fail") return;

    const path = NodePath.join(
      process.env.E2E_ARTIFACTS_DIR ?? NodeOS.tmpdir(),
      `isnadi-e2e-${task.name.replace(/\W+/g, "-")}.png`,
    );

    await page.screenshot({ path });
    console.error(`Screenshot: ${path}`);
  });

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
    await conversation().getByText(STUB_REPLY).waitFor();
  });

  it("keeps the conversation after a reload", async () => {
    await page.reload();

    await conversation().getByText(STUB_REPLY).waitFor();
  });
});
