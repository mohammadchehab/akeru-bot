import type { ScopedThreadRef } from "@isnadi/contracts";

export function resolveThreadSelectionDetailRef(
  selectedThreadRef: ScopedThreadRef | null,
  hasSelectedThreadShell: boolean,
): ScopedThreadRef | null {
  return hasSelectedThreadShell ? null : selectedThreadRef;
}
