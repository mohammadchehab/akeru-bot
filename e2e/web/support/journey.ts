import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { chromium, type Browser, type Page } from "playwright-core";
import { afterEach, beforeEach } from "vite-plus/test";

import { reportFailure } from "./diagnostics.ts";
import type { Stack } from "./stack.ts";

/** Launches the journeys' browser: Chrome by default, headless unless `E2E_HEADED=1`. */
export function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
    headless: process.env.E2E_HEADED !== "1",
  });
}

/**
 * Registers the hooks every journey shares; call it inside `describe`. A step stops at once if the server
 * restarted (its sessions are gone), and a failing step leaves a screenshot plus a report of where the
 * journey stood. `current` is read when a hook runs, after `beforeAll` has set the stack and page.
 */
export function journeyReport(
  current: () => { stack: Stack; page: Page; seen: () => ReadonlyArray<string> },
) {
  beforeEach(() => current().stack.assertNotRestarted());

  afterEach(async ({ task }) => {
    if (task.result?.state !== "fail") return;

    const { stack, page, seen } = current();

    const path = NodePath.join(
      process.env.E2E_ARTIFACTS_DIR ?? NodeOS.tmpdir(),
      `isnadi-e2e-${task.name.replace(/\W+/g, "-")}.png`,
    );

    // A crashed or closed page cannot be photographed; the report below is still the most useful part.
    try {
      await page.screenshot({ path });
      console.error(`Screenshot: ${path}`);
    } catch (error) {
      console.error(`No screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }

    await reportFailure(page, stack, seen());
  });
}
