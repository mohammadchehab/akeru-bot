/**
 * `agent login` with `NO_OPEN_BROWSER=1` prints a link instead of opening a browser, so a client on
 * another machine can show it. This reads that link out of the CLI's output as it arrives.
 *
 * @module provider/Layers/cursor/CursorLogin
 */
const LOGIN_LINK = /https:\/\/\S+/;

/** The first https link in the output, or `undefined` while the CLI has not printed one yet. */
export function parseCursorLoginUrl(output: string): string | undefined {
  return LOGIN_LINK.exec(output)?.[0];
}
