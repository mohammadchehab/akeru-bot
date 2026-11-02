import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { ReplyMessageBody } from "./ReplyReference";

describe("reply message", () => {
  it("shows the referenced message and the reply as separate content", () => {
    const markup = renderToStaticMarkup(
      <ReplyMessageBody text={"> Replying to Layout check\n> OK\n\nWhich message?"} />,
    );

    expect(markup).toContain('data-testid="reply-reference"');
    expect(markup).toContain("Layout check");
    expect(markup).toContain(">OK</span>");
    expect(markup).toContain(">Which message?</p>");
    expect(markup).not.toContain("&gt; Replying to");
    expect(markup).not.toContain("border-l-2");
  });

  it("gives each paragraph of a user message its own direction", () => {
    const markup = renderToStaticMarkup(
      <ReplyMessageBody text={"مرحبا بالجميع\n\nHello everyone\nsecond line"} />,
    );

    expect(markup.match(/<p dir="auto" class="whitespace-pre-wrap">/g)).toHaveLength(2);
    expect(markup).toContain(">مرحبا بالجميع</p>");
    expect(markup).toContain(">Hello everyone\nsecond line</p>");
  });

  it("keeps one paragraph as a single dir=auto paragraph and gives the quote a direction", () => {
    const markup = renderToStaticMarkup(
      <ReplyMessageBody text={"> Replying to Ada\n> مرحبا\n\nOK"} />,
    );

    expect(markup.match(/<p /g)).toHaveLength(1);
    expect(markup).toContain('<p dir="auto" class="whitespace-pre-wrap">OK</p>');
    expect(markup).toContain('<span dir="auto" class="min-w-0 flex-1 truncate">');
  });
});
