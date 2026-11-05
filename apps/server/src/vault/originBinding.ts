/**
 * Decides whether a stored credential may be typed into the page a bot is on.
 * A credential is bound to exact https origins when it is stored. The vault
 * asks this module at injection time, using what the browser reports then.
 */

/** Reduces a URL to its exact https origin, or null for anything else (http, userinfo, opaque). */
export function normalizeHttpsOrigin(input: string): string | null {
  const parsed = URL.parse(input);
  if (parsed === null || parsed.protocol !== "https:") return null;
  if (parsed.username !== "" || parsed.password !== "") return null;
  return parsed.origin;
}

export type InjectionTarget = {
  /** URL of the top-level frame as the browser reports it right now. */
  readonly topFrameUrl: string;
  /** URL of the frame that owns the field being filled. */
  readonly fieldFrameUrl: string;
};

export type OriginCheck =
  | { readonly allowed: true; readonly origin: string }
  | {
      readonly allowed: false;
      readonly reason: "top-frame-not-https" | "origin-not-bound" | "field-not-in-top-frame";
    };

/**
 * Exact origin match only: scheme, host and port. No subdomain or wildcard
 * matching, so a look-alike or sibling host never qualifies. The field must
 * live in the top frame, which rules out cross-origin iframes.
 */
export function checkInjectionTarget(
  boundOrigins: ReadonlyArray<string>,
  target: InjectionTarget,
): OriginCheck {
  const topOrigin = normalizeHttpsOrigin(target.topFrameUrl);
  if (topOrigin === null) return { allowed: false, reason: "top-frame-not-https" };
  if (!boundOrigins.includes(topOrigin)) return { allowed: false, reason: "origin-not-bound" };
  if (normalizeHttpsOrigin(target.fieldFrameUrl) !== topOrigin) {
    return { allowed: false, reason: "field-not-in-top-frame" };
  }
  return { allowed: true, origin: topOrigin };
}
