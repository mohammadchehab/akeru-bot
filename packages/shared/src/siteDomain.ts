import { getDomain } from "tldts";

/**
 * The one host form every site check compares: URL-normalized (so `0x7f.1` and `2130706433`
 * become dotted IPv4), lowercased, without v6 brackets, zone, or a trailing dot. Returns null for
 * a host that does not parse, so callers fail closed.
 */
export const normalizeHost = (host: string): string | null => {
  try {
    return new URL(`http://${host}`).hostname
      .replace(/^\[|\]$/g, "")
      .replace(/%.*$/, "")
      .replace(/\.$/, "");
  } catch {
    return null;
  }
};

/**
 * True when a normalized host sits at least one label below a public suffix (`example.com` yes;
 * `com`, `co.uk`, `localhost` no).
 */
export const hasRegistrableDomain = (host: string): boolean => getDomain(host) !== null;
