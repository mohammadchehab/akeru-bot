import { useAtomValue } from "@effect/atom-react";

import { usePrimaryEnvironmentId } from "./environments";
import { environmentSnapshotAtom } from "./shell";

/** The primary environment's shell snapshot, or null before it connects. */
export function useEnvironmentSnapshot() {
  const environmentId = usePrimaryEnvironmentId();

  // SAFETY: the empty environment ID is an inactive-query sentinel; the atom sends no request until an environment exists.
  return useAtomValue(environmentSnapshotAtom(environmentId ?? ("" as never)));
}
