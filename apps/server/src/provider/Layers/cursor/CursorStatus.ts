/**
 * Parses the TEXT of `agent status`. The command exits 0 whether or not the user
 * is signed in, so the exit code says nothing about login state.
 *
 * @module provider/Layers/cursor/CursorStatus
 */
export interface CursorStatus {
  readonly authenticated: boolean;
  readonly email?: string;
}

const LOGGED_IN = /Logged in as\s+(\S+)/i;

export function parseCursorStatus(output: string): CursorStatus {
  const email = LOGGED_IN.exec(output)?.[1];

  return email === undefined ? { authenticated: false } : { authenticated: true, email };
}
