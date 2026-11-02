import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@effect/atom-react", () => ({ useAtomValue: () => null }));

vi.mock("../hooks/useTheme", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));

vi.mock("../state/use-atom-query-runner", () => ({ useAtomQueryRunner: () => vi.fn() }));

vi.mock("../state/use-atom-command", () => ({ useAtomCommand: () => vi.fn() }));

vi.mock("../state/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../state/session")>()),
  usePreparedConnection: () => ({ _tag: "Loading" }),
}));

vi.mock("../state/entities", () => ({
  readThreadShell: () => null,
  useProjects: () => [],
}));

vi.mock("../localShellAccess", () => ({
  useLocalShellAccess: () => ({ isLocal: true, isResolved: true }),
}));

vi.mock("../editorPreferences", () => ({
  useOpenInPreferredEditor: () => vi.fn(),
  usePreferredEditor: () => [null, vi.fn()],
}));

vi.mock("~/lib/openPullRequestLink", () => ({
  findProjectForChangeRequest: () => undefined,
  matchesLinkedPullRequestUrl: () => false,
  parseChangeRequestUrl: () => null,
  useOpenChangeRequestLink: () => vi.fn(),
}));

import { LanguageProvider } from "../i18n";
import ChatMarkdown from "./ChatMarkdown";

function render(text: string) {
  return renderToStaticMarkup(
    <LanguageProvider testCatalog={{ locale: "ar", catalog: {} }}>
      <ChatMarkdown cwd="/tmp/project" text={text} />
    </LanguageProvider>,
  );
}

describe("chat markdown direction", () => {
  it("resolves each text block's direction from its own text", () => {
    const html = render(
      [
        "# مرحبا",
        "",
        "فقرة عربية",
        "",
        "English paragraph",
        "",
        "- بند",
        "",
        "> اقتباس",
        "",
        "| أ | ب |",
        "| --- | --- |",
        "| 1 | 2 |",
      ].join("\n"),
    );

    expect(html).toMatch(/<h1[^>]*dir="auto"/);
    // Two paragraphs plus the one inside the quote.
    expect(html.match(/<p[^>]*dir="auto"/g)).toHaveLength(3);
    expect(html).toMatch(/<li[^>]*dir="auto"/);
    expect(html).toMatch(/<blockquote[^>]*dir="rtl"/);
    expect(html).toMatch(/<th[^>]*dir="auto"/);
    expect(html).toMatch(/<td[^>]*dir="auto"/);
  });

  it("gives quotes and lists the direction of their first letter", () => {
    expect(render("> اقتباس")).toMatch(/<blockquote[^>]*dir="rtl"/);
    expect(render("> [!NOTE]\n> ملاحظة")).toMatch(/<div role="note"[^>]*dir="rtl"/);
    expect(render("- بند\n- item")).toMatch(/<ul[^>]*dir="rtl"/);
    expect(render("1. بند\n2. item")).toMatch(/<ol[^>]*dir="rtl"/);
    expect(render("- item\n- بند")).toMatch(/<ul[^>]*dir="ltr"/);
    expect(render("> quote")).toMatch(/<blockquote[^>]*dir="ltr"/);
    expect(render("- 1\n- 2")).not.toMatch(/<ul[^>]*dir=/);
  });

  it("keeps inline code on the left-to-right island", () => {
    const html = render("استخدم `pnpm install` الآن");

    expect(html).toMatch(/<code[^>]*dir="ltr"/);
  });
});
