import { describe, expect, it } from "vite-plus/test";

import bootstrapHtml from "../index.html?raw";
import manifestJson from "../public/manifest.webmanifest?raw";

// The static bootstrap shell renders before React mounts, so its branding
// lives in index.html instead of branding.ts and needs its own check.
describe("bootstrap chrome", () => {
  it("brands the static bootstrap shell as IsnadiBot", () => {
    expect(bootstrapHtml).toContain("<title>IsnadiBot</title>");
    expect(bootstrapHtml).toContain('aria-label="IsnadiBot splash screen"');
    expect(bootstrapHtml).toContain('alt="IsnadiBot"');
    expect(bootstrapHtml).not.toContain("T3 Code");
    expect(bootstrapHtml).not.toContain("t3.codes");
    expect(bootstrapHtml).not.toContain("ping.gg");
  });

  it("brands the web app manifest as IsnadiBot", () => {
    const manifest = JSON.parse(manifestJson) as { name?: string; short_name?: string };

    expect(manifest.name).toBe("IsnadiBot");
    expect(manifest.short_name).toBe("IsnadiBot");
  });
});
