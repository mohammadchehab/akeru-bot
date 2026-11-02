import type { Page } from "playwright-core";

import type { Stack } from "./stack.ts";

/** Collects what the browser reports while a journey runs; read it back with the returned function. */
export function watchPage(page: Page): () => ReadonlyArray<string> {
  const lines: Array<string> = [];

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) lines.push(`navigated: ${frame.url()}`);
  });
  page.on("console", (message) => {
    if (
      message.type() === "error" ||
      message.type() === "warning" ||
      message.text().startsWith("[vite]")
    ) {
      lines.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => lines.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) =>
    lines.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      lines.push(`HTTP ${String(response.status())}: ${response.url()}`);
  });

  return () => lines;
}

/** Prints where a failing journey stood: URL, visible text, browser reports and the dev runner's tail. */
export async function reportFailure(page: Page, stack: Stack, seen: ReadonlyArray<string>) {
  const text = await page
    .locator("body")
    .innerText({ timeout: 5_000 })
    .catch(() => "(page text unavailable)");

  console.error(
    [
      `URL: ${page.url()}`,
      `Page text: ${text.slice(0, 800)}`,
      `Browser reports (${String(seen.length)}):`,
      ...seen.slice(-30),
      "Dev runner output tail:",
      stack.output().slice(-3_000),
    ].join("\n"),
  );
}
