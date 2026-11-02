import { type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { watchPage } from "../support/diagnostics.ts";
import { journeyReport, launchBrowser } from "../support/journey.ts";
import { startStack, type Stack } from "../support/stack.ts";
import { stubReplyFrom } from "../support/stubOpenAI.ts";

const REPLY_TIMEOUT_MS = 30_000;

interface RequestMessage {
  readonly role: string;
  readonly content: string | ReadonlyArray<{ readonly text?: string }>;
}

/** A chat completion request's messages, each reduced to its role and text. */
function requestMessages(body: string): ReadonlyArray<{ role: string; text: string }> {
  // SAFETY: the stub only receives OpenAI-style chat completion bodies from the server.
  const parsed = JSON.parse(body) as { readonly messages?: ReadonlyArray<RequestMessage> };

  return (parsed.messages ?? []).map((message) => ({
    role: message.role,
    text: Array.isArray(message.content)
      ? message.content.map((part) => part.text ?? "").join("")
      : String(message.content),
  }));
}

// Speaker attribution and roster (docs/internals/group-chats.md). Every bot in a group reads one
// shared history, so Bot2 must see Bot1's reply as another member's message, not as its own.
// The stub keeps each request body, so the journeys check what Bot2 was really sent.
describe("group chat speaker attribution and roster", () => {
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

  /** Sends `text` into the open chat and waits for reply number `count`. */
  const send = async (chat: string, text: string, count: number) => {
    const composer = page.getByRole("textbox", { name: `Message ${chat}` });

    await composer.fill(text);

    // A message sent while a turn is still running queues behind it. Once there is text the
    // submit button reads "<bot> is working" until the turn ends, then "Send message".
    await page.getByRole("button", { name: "Send message" }).waitFor({ timeout: REPLY_TIMEOUT_MS });
    await composer.press("Enter");

    const row = replies().nth(count - 1);

    await row.waitFor({ timeout: REPLY_TIMEOUT_MS });

    return row;
  };

  /** The messages of the most recent chat completion answered by `bot` (Bot1 or Bot2 only). */
  const lastRequestOf = (bot: "Bot1" | "Bot2") => {
    const completion = stack.stub.completions.findLast((candidate) => candidate.bot === bot);

    expect(completion, `no completion for ${bot}`).toBeDefined();

    return requestMessages(completion?.body ?? "{}");
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

  it("lets Bot1 answer first", async () => {
    const row = await send("Crew", "hi", 1);

    await row.getByText(stubReplyFrom("Bot1")).waitFor({ timeout: REPLY_TIMEOUT_MS });
  });

  it("sends Bot2 the group's roster", async () => {
    const row = await send("Crew", "@Bot2 hi", 2);

    await row.getByText(stubReplyFrom("Bot2")).waitFor({ timeout: REPLY_TIMEOUT_MS });

    const instructions = lastRequestOf("Bot2")
      .filter((message) => message.role === "system")
      .map((message) => message.text)
      .join("\n");

    // The group section names the group and lists each member.
    expect(instructions).toContain("Crew");
    expect(instructions).toContain("Bot1");
    expect(instructions).toContain("Bot2");
  });

  it("shows Bot2 Bot1's reply as another member's message, not its own", () => {
    const messages = lastRequestOf("Bot2");
    const bot1Reply = stubReplyFrom("Bot1");

    // Bot1's reply arrives as a user-role message wrapped with its speaker...
    const wrapped = messages.filter(
      (message) =>
        message.role === "user" &&
        message.text.includes('<group-message from="Bot1"') &&
        message.text.includes(bot1Reply),
    );

    expect(wrapped).toHaveLength(1);

    // ...and no assistant-role message carries it, or Bot2 would read it as something it said.
    expect(
      messages.filter(
        (message) => message.role === "assistant" && message.text.includes(bot1Reply),
      ),
    ).toEqual([]);
  });

  it("labels Bot2's reply as Bot2, live and after a reload", async () => {
    await replies().nth(1).getByText("Bot2", { exact: true }).waitFor({ timeout: 5_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await replies()
      .nth(1)
      .getByText("Bot2", { exact: true })
      .waitFor({ timeout: REPLY_TIMEOUT_MS });
  });

  it("leaves a direct chat alone: no group section and no rewritten history", async () => {
    // The roster lists the bots after the group, ahead of the chat area.
    await page.getByText("Bot1", { exact: true }).first().click();

    const composer = page.getByRole("textbox", { name: "Message Bot1" });

    await composer.fill("hello directly");
    await page.getByRole("button", { name: "Send message" }).waitFor({ timeout: REPLY_TIMEOUT_MS });
    await composer.press("Enter");
    await page.getByText(stubReplyFrom("Bot1")).last().waitFor({ timeout: REPLY_TIMEOUT_MS });

    const direct = stack.stub.completions.findLast(
      (candidate) => candidate.user === "hello directly",
    );

    expect(direct, "no completion for the direct chat").toBeDefined();
    expect(direct?.body ?? "").not.toContain("<group-message");
    expect(direct?.body ?? "").not.toContain("Crew");
  });
});
