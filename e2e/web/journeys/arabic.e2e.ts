import { chromium, type Browser, type Page } from "playwright-core";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";

import { startStack, type Stack } from "../support/stack.ts";
import { stubReplyFrom } from "../support/stubOpenAI.ts";

// Draft for slice 7 of #83. Arabic is not listed in Settings > Language until slices 2 to 6
// land and slice 7 registers it, so the journey runs only with E2E_ARABIC=1. Finish it, and drop
// the gate, once Arabic ships.
const arabicShips = process.env.E2E_ARABIC === "1";

const ARABIC_PARAGRAPH = "مرحبا بالجميع، هذه رسالة تجريبية";

const ENGLISH_PARAGRAPH = "Hello everyone, this is a test message";

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;

describe.skipIf(!arabicShips)("Arabic interface", () => {
  let stack: Stack;
  let browser: Browser;
  let page: Page;

  const conversation = () => page.getByRole("main");

  const documentDirection = () =>
    page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
    }));

  // Where the page, the sidebar and the main column sit, so a failure says what overlapped what.
  const layoutReport = () =>
    page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();

        return rect ? [rect.x, rect.y, rect.width, rect.height].map(Math.round) : null;
      };

      return {
        url: location.pathname,
        dir: document.documentElement.dir,
        viewport: [innerWidth, innerHeight],
        sidebar: box('[data-slot="sidebar"]'),
        sidebarInner: box('[data-slot="sidebar-container"]'),
        mains: document.querySelectorAll("main").length,
        main: box("main"),
        language: box("#language-preference"),
        text: document.body.innerText.slice(0, 200),
        message: [...document.querySelectorAll("main *")]
          .filter((element) => element.textContent?.includes("هذه رسالة") && element.children.length < 4)
          .slice(-2)
          .map((element) => element.outerHTML.slice(0, 600)),
      };
    });

  // The centre of the chat column: left of the window's middle when the roster sits on the right.
  const chatCentre = async () => {
    const box = await conversation().boundingBox();
    const viewport = page.viewportSize();

    if (!box || !viewport) throw new Error("The chat column or the viewport has no size.");

    return (box.x + box.width / 2) / viewport.width;
  };

  const chooseLanguage = async (label: string) => {
    await page.goto(new URL("/settings/general", page.url()).toString());
    await page.locator("#language-preference").click();
    await page.getByRole("option", { name: label }).click();
  };

  beforeAll(async () => {
    stack = await startStack();
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: process.env.E2E_HEADED !== "1",
    });
    page = await browser.newPage();
  });

  afterEach(async ({ task }) => {
    if (task.result?.state !== "fail") return;

    const path = NodePath.join(
      process.env.E2E_ARTIFACTS_DIR ?? NodeOS.tmpdir(),
      `isnadi-e2e-${task.name.replace(/\W+/g, "-")}.png`,
    );

    await page.screenshot({ path });
    console.error(`Screenshot: ${path}`);
    console.error(`Layout: ${JSON.stringify(await layoutReport())}`);
  });

  afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  it("pairs and creates a bot to chat with", async () => {
    await page.goto(stack.pairingUrl);
    await page.getByText("Create your first bot").waitFor();
    await page.getByRole("button", { name: "Create bot" }).click();
    await page.getByPlaceholder("Name your bot").fill("Echo");
    await page.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
    await page.waitForURL(/\/bots\//);
    await page.getByRole("textbox", { name: "Message Echo" }).waitFor();

    expect(await documentDirection()).toMatchObject({ dir: "ltr" });
    expect(await chatCentre()).toBeGreaterThan(0.5);
  });

  it("flips the whole interface to right-to-left when Arabic is chosen", async () => {
    await chooseLanguage("العربية");

    await page.waitForFunction(() => document.documentElement.dir === "rtl");

    expect(await documentDirection()).toEqual({ dir: "rtl", lang: "ar" });

    // The roster moves to the right, so the chat column's centre is left of the window's middle.
    await page.goBack();
    await page.getByRole("main").waitFor();

    expect(await chatCentre()).toBeLessThan(0.5);
  });

  it("shows each paragraph of a mixed message in its own direction", async () => {
    const composer = page.getByRole("textbox").last();

    await composer.fill(ARABIC_PARAGRAPH);
    await composer.press("Shift+Enter");
    await composer.press("Shift+Enter");
    await composer.pressSequentially(ENGLISH_PARAGRAPH);
    await composer.press("Enter");

    const arabic = conversation().getByText(ARABIC_PARAGRAPH, { exact: true });
    const english = conversation().getByText(ENGLISH_PARAGRAPH, { exact: true });

    await arabic.waitFor();
    await english.waitFor();

    const direction = (locator: typeof arabic) =>
      locator.evaluate((element) => getComputedStyle(element).direction);

    // A sent message resolves direction per paragraph, like the composer it was typed in.
    expect(await arabic.getAttribute("dir")).toBe("auto");
    expect(await english.getAttribute("dir")).toBe("auto");

    expect(await direction(arabic)).toBe("rtl");
    expect(await direction(english)).toBe("ltr");

    await conversation().getByText(stubReplyFrom("Echo")).waitFor();
  });

  it("keeps Western digits in the interface and in what was typed", async () => {
    const digits = "12345";

    await page.getByRole("textbox").last().fill(`Order ${digits}`);
    await page.getByRole("textbox").last().press("Enter");
    await conversation().getByText(`Order ${digits}`).waitFor();

    const text = await page.locator("body").innerText();

    expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
    expect(text).toContain(digits);
  });

  it("restores the left-to-right layout when English is chosen again", async () => {
    await chooseLanguage("English");

    await page.waitForFunction(() => document.documentElement.dir === "ltr");

    expect(await documentDirection()).toMatchObject({ dir: "ltr", lang: "en" });
  });
});
