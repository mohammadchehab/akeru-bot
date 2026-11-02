// Scheme and origin names for the renderer; no Electron import so pure code can share them.

export const DESKTOP_HOST = "app";

export const DESKTOP_PRODUCTION_SCHEME = "isnadi";

export const DESKTOP_DEVELOPMENT_SCHEME = "isnadi-dev";

/**
 * Compatibility only: builds released before the Isnadi rename served the
 * renderer from these schemes. Chromium keys web storage by origin, so the
 * legacy origins stay registered as privileged schemes so their localStorage
 * can be read once and carried over (see LegacyRendererStorageMigration.ts).
 */
export const LEGACY_AKERU_DESKTOP_PRODUCTION_SCHEME = "akeru";

export const LEGACY_AKERU_DESKTOP_DEVELOPMENT_SCHEME = "akeru-dev";

export function getLegacyDesktopScheme(isDevelopment: boolean): string {
  return isDevelopment
    ? LEGACY_AKERU_DESKTOP_DEVELOPMENT_SCHEME
    : LEGACY_AKERU_DESKTOP_PRODUCTION_SCHEME;
}

export function getDesktopScheme(isDevelopment: boolean): string {
  return isDevelopment ? DESKTOP_DEVELOPMENT_SCHEME : DESKTOP_PRODUCTION_SCHEME;
}

export function getDesktopOrigin(isDevelopment: boolean): string {
  return `${getDesktopScheme(isDevelopment)}://${DESKTOP_HOST}`;
}

export function getDesktopUrl(isDevelopment: boolean): string {
  return `${getDesktopOrigin(isDevelopment)}/`;
}
