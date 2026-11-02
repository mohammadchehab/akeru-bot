import { type Browser, type BrowserContext, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { watchPage } from "../support/diagnostics.ts";
import { journeyReport, launchBrowser } from "../support/journey.ts";
import { startStack, type Stack } from "../support/stack.ts";

describe("group people", () => {
  let stack: Stack;
  let browser: Browser;
  let owner: Page;
  let seen: () => ReadonlyArray<string>;
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
    browser = await launchBrowser();
    owner = await browser.newPage();
    seen = watchPage(owner);
    guestContext = await browser.newContext();
    guest = await guestContext.newPage();
  });

  journeyReport(() => ({ stack, page: owner, seen }));

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
