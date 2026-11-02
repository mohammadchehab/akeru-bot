import {
  ISNADI_REPOSITORY_URL,
  ISNADI_PRIVACY_POLICY_URL,
  ISNADI_TERMS_URL,
} from "@isnadi/contracts/settings";

// There is no policy site: legal documents are the license, the README, and the
// security page in the project repository.
export const PRIVACY_POLICY_URL = ISNADI_PRIVACY_POLICY_URL;

export const SECURITY_POLICY_URL = `${ISNADI_REPOSITORY_URL}/security`;

export const TERMS_OF_SERVICE_URL = ISNADI_TERMS_URL;

export const LEGAL_URL = ISNADI_TERMS_URL;

export const ALLOWED_LEGAL_DOCUMENT_URLS = [
  LEGAL_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  SECURITY_POLICY_URL,
] as const;

function webDocumentIdentity(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

const ALLOWED_LEGAL_DOCUMENT_IDENTITIES = new Set(
  ALLOWED_LEGAL_DOCUMENT_URLS.flatMap((url) => {
    const value = webDocumentIdentity(url);

    return value === null ? [] : [value];
  }),
);

export function isLegalDocumentUrl(value: string): boolean {
  const identity = webDocumentIdentity(value);

  return identity !== null && ALLOWED_LEGAL_DOCUMENT_IDENTITIES.has(identity);
}
