import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";

import { startStack, type Stack } from "../support/stack.ts";

describe("group people", () => {
  let stack: Stack;
  let browser: Browser;
  let owner: Page;
  let guestContext: BrowserContext;
  let guest: Page;

  const origin = () => new URL(stack.pairingUrl).origin;
  const people = () => owner.getByRole("region", { name: "People" });

  const createBot = async (name: string) => {
    await owner.getByTestId("roster-new-bot").click();
    await owner.getByRole("menuitem", { name: "New bot" }).click();
    await owner.getByPlaceholder("Name your bot").fill(name);
    await owner.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
    await owner.getByRole("dialog").waitFor({ state: "hidden" });
  };

  beforeAll(async () => {
    stack = await startStack();
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: process.env.E2E_HEADED !== "1",
    });
    owner = await browser.newPage();
    guestContext = await browser.newContext();
    guest = await guestContext.newPage();
  });

  // A failing step leaves a screenshot behind; the path is in the test output.
  afterEach(async ({ task }) => {
    if (task.result?.state !== "fail") return;

    const path = NodePath.join(
      process.env.E2E_ARTIFACTS_DIR ?? NodeOS.tmpdir(),
      `isnadi-e2e-${task.name.replace(/\W+/g, "-")}.png`,
    );

    await owner.screenshot({ path });
    console.error(`Screenshot: ${path}`);
  });

  afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  it("sets up a group and a second paired person", async () => {
    await owner.goto(stack.pairingUrl, { waitUntil: "domcontentloaded" });
    await owner.getByText("Create your first bot").waitFor();
    await owner.getByRole("button", { name: "Create bot" }).click();
    await owner.getByPlaceholder("Name your bot").fill("Alpha");
    await owner.getByRole("dialog").getByRole("button", { name: "Create bot" }).click();
    await owner.getByRole("dialog").waitFor({ state: "hidden" });
    await createBot("Beta");

    await owner.getByTestId("roster-new-bot").click();
    await owner.getByRole("menuitem", { name: "New group" }).click();

    const dialog = owner.getByRole("dialog");

    await dialog.getByLabel("Group name").fill("Ops");

    for (const name of ["Alpha", "Beta"]) {
      const box = dialog.getByRole("checkbox", { name });

      await box.focus();
      await box.press("Space");
      expect(await box.isChecked()).toBe(true);
    }

    await dialog.getByRole("button", { name: "Create group" }).click();
    await owner.getByRole("dialog").waitFor({ state: "hidden" });

    // The owner holds the admin scope, so it can mint a second device's pairing link.
    const response = await owner.request.post(`${origin()}/api/auth/pairing-token`, {
      data: { label: "Guest" },
    });

    expect(response.ok()).toBe(true);

    // SAFETY: POST /api/auth/pairing-token answers with the pairing credential as `credential`.
    const { credential } = (await response.json()) as { credential: string };

    await guest.goto(`${origin()}/pair#token=${credential}`, { waitUntil: "domcontentloaded" });
    await guest.getByText("Alpha").first().waitFor();
  });

  it("adds the second person, removes them after a confirmation, and adds them back", async () => {
    await owner.getByRole("button", { name: "Open Ops group sidebar" }).first().click();
    await people().waitFor();

    await people().getByRole("combobox", { name: "Add person" }).click();
    await owner.getByRole("option", { name: "Guest" }).click();
    await people().getByRole("button", { name: "Add person to group" }).click();
    await people().getByRole("button", { name: "Remove Guest from Ops" }).waitFor();

    // Removing asks first, and cancelling keeps the person.
    await people().getByRole("button", { name: "Remove Guest from Ops" }).click();
    await owner.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await owner.getByRole("alertdialog").waitFor({ state: "hidden" });
    await people().getByText("Guest").waitFor();

    await people().getByRole("button", { name: "Remove Guest from Ops" }).click();
    await owner.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
    await people().getByText("Guest").waitFor({ state: "hidden" });

    // The removed person is offered again and can be re-added.
    await people().getByRole("combobox", { name: "Add person" }).click();
    await owner.getByRole("option", { name: "Guest" }).click();
    await people().getByRole("button", { name: "Add person to group" }).click();
    await people().getByText("Guest").waitFor();
  });
});
