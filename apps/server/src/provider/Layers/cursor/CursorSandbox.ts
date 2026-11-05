/**
 * Cursor runs its CLI on the environment host, like standard OpenCode on the legacy bridge, so a
 * bot whose sandbox is a remote workspace would silently work on this machine instead. A bot with
 * a remote sandbox also defaults to `full-access`, which would turn into `--force` on the host.
 * Refuse the combination at session start rather than guess.
 *
 * @module provider/Layers/cursor/CursorSandbox
 */
import type { ProviderDriverKind } from "@isnadi/contracts";

const CURSOR_DRIVER = "cursor";

/** The error detail to show, or undefined when this driver and sandbox may start a session. */
export function cursorSandboxRejection(
  driver: ProviderDriverKind,
  /** Any string, so an unknown or future kind is rejected too: only `local` and none pass. */
  sandbox: string | null,
): string | undefined {
  return driver === CURSOR_DRIVER && sandbox !== null && sandbox !== "local"
    ? `Cursor runs on this machine and cannot use the '${sandbox}' sandbox. Set the bot's sandbox to Local to use Cursor.`
    : undefined;
}
