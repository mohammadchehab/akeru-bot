import { describe, expect, it } from "vite-plus/test";

import { isLegalDocumentUrl } from "./legal-document-url";

const REPO = "https://github.com/mohammadchehab/isnadibot";

describe("isLegalDocumentUrl", () => {
  it.each([
    `${REPO}/blob/main/LICENSE`,
    `${REPO}/blob/main/LICENSE/`,
    `${REPO}/blob/main/README.md?source=app`,
    `${REPO}/blob/main/LICENSE#updates`,
    `${REPO}/security`,
  ])("allows a configured legal document: %s", (url) => {
    expect(isLegalDocumentUrl(url)).toBe(true);
  });

  it.each([`${REPO}/releases`, "https://example.com/legal", "javascript:alert(1)", "not-a-url"])(
    "rejects a URL outside the legal-document allowlist: %s",
    (url) => {
      expect(isLegalDocumentUrl(url)).toBe(false);
    },
  );
});
