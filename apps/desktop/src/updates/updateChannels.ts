import type { DesktopUpdateChannel } from "@isnadi/contracts";

export function resolveDefaultDesktopUpdateChannel(_appVersion: string): DesktopUpdateChannel {
  return "latest";
}
