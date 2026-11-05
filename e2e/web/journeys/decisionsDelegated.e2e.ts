import { type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { watchPage } from "../support/diagnostics.ts";
import { createBot, createGroup } from "../support/groupChat.ts";
import { journeyReport, launchBrowser } from "../support/journey.ts";
import { startStack, type Stack } from "../support/stack.ts";
import { STUB_DELEGATE_MARKER } from "../support/stubOpenAI.ts";

const WAIT_MS = 30_000;

function endsInDelegatedTask(body: string): boolean {
  const parsed: { readonly messages?: ReadonlyArray<{ role?: string; content?: unknown }> } =
    JSON.parse(body);
  const last = parsed.messages?.at(-1);

  return last?.role === "user" && JSON.stringify(last.content).includes("Take this over");
}

// Crew: boss Alpha, member Bravo. Alpha delegates a task to Bravo; Bravo's delegated chat then waits
// on an approval, and the Decisions group lists it under the chat the user actually started.
describe("decisions: delegated approval", () => {
  let stack: Stack;
  let browser: Browser;
  let page: Page;
  let seen: () => ReadonlyArray<string>;

  const decisions = () => page.getByTestId("decisions-group");

  beforeAll(async () => {
    stack = await startStack();
    browser = await launchBrowser();
    page = await browser.newPage();
    seen = watchPage(page);
  });

  journeyReport(() => ({ stack, page, seen }));

  afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  it("lists the delegating chat while a delegated bot waits on an approval", async () => {
    await page.goto(stack.pairingUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Create your first bot").waitFor();
    await createBot(page, "Alpha", true);
    await createBot(page, "Bravo", false);
    await createGroup(page, "Crew", ["Alpha", "Bravo"]);

    const composer = page.getByRole("textbox", { name: "Message Crew" });

    await composer.fill(`Hand this over ${STUB_DELEGATE_MARKER}`);
    await composer.press("Enter");

    // Leave the group so the row must come from the Decisions group, not the open chat.
    await page.getByRole("button", { name: "Alpha" }).first().click();
    await page.getByRole("textbox", { name: "Message Alpha" }).waitFor();

    const row = decisions().getByRole("button", { name: /^Approval needed: Crew/ });

    // First wait: Alpha's own SendToAgent needs the user's go-ahead before anything is delegated.
    await row.waitFor({ timeout: WAIT_MS });
    await row.click();
    await page.getByLabel("Approval required").waitFor();
    await page
      .getByRole("button", { name: /^(Allow once|Approve)$/ })
      .first()
      .click();

    // Second wait: Bravo's delegated chat calls the protected tool. The task has to reach Bravo as
    // its own request first, so this row is the delegated approval, not Alpha's.
    await expect
      .poll(() => stack.stub.completions.some((completion) => endsInDelegatedTask(completion.body)), {
        timeout: WAIT_MS,
      })
      .toBe(true);
    await page.getByRole("textbox", { name: "Message Alpha" }).waitFor();
    await row.waitFor({ timeout: WAIT_MS });
    expect(await decisions().getByRole("button").count()).toBe(1);
  });
});
