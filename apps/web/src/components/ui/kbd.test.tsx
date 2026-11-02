import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Kbd, KbdGroup } from "./kbd";

describe("shortcut chords", () => {
  it("stay left to right inside a right-to-left interface", () => {
    const html = renderToStaticMarkup(
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );

    expect(html).toMatch(
      /<kbd[^>]*dir="ltr"[^>]*data-slot="kbd-group"|data-slot="kbd-group"[^>]*dir="ltr"/,
    );
    expect(html).toMatch(/<kbd[^>]*dir="ltr"[^>]*data-slot="kbd"|data-slot="kbd"[^>]*dir="ltr"/);
  });
});
