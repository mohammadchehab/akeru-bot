import type { ModelSelection } from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";

import type { AgentControllerError } from "../../Errors.ts";

export type SkipReason =
  | "unavailable"
  | "paused"
  | "benched"
  | "policy-denied"
  | "new-thread-required";

export interface SkippedEntry {
  readonly selection: ModelSelection;
  readonly reason: SkipReason;
  /** Epoch milliseconds at which the entry may be tried again, when known. */
  readonly until?: number;
  /** Why inspection refused the entry. Set only for `unavailable`. */
  readonly error?: AgentControllerError;
}

export interface RouterInput<Inspected> {
  /** The bot's primary first, then its fallbacks in order. */
  readonly chain: ReadonlyArray<ModelSelection>;
  /** The fallback policy. Called for fallbacks only; the primary always runs. */
  readonly allowed: (selection: ModelSelection, index: number) => boolean;
  /** True when moving to this entry would need a new thread (the instance cannot change model mid-thread). */
  readonly requiresNewThread: (selection: ModelSelection) => boolean;
  readonly pausedUntil: (selection: ModelSelection) => Effect.Effect<number | undefined>;
  readonly benchedUntil: (instanceId: string) => Effect.Effect<number | undefined>;
  readonly inspect: (selection: ModelSelection) => Effect.Effect<Inspected, AgentControllerError>;
}

export interface RouterPick<Inspected> {
  readonly selection: ModelSelection;
  /** Position in the chain; 0 is the primary. */
  readonly index: number;
  readonly inspected: Inspected;
}

/**
 * Walks `chain` in order and returns the first entry a turn may run on, with
 * every entry it passed over and why. Entries are never skipped silently: the
 * caller names them in the chat. Cheap checks (policy, pauses, benches) run
 * before `inspect`, which has side effects on the connection cache, so an
 * entry that cannot run is never inspected.
 */
export const pickEntry = Effect.fn("ModelRouter.pickEntry")(function* <Inspected>(
  input: RouterInput<Inspected>,
) {
  const skipped: Array<SkippedEntry> = [];

  for (const [index, selection] of input.chain.entries()) {
    if (index > 0 && !input.allowed(selection, index)) {
      skipped.push({ selection, reason: "policy-denied" });
      continue;
    }

    if (index > 0 && input.requiresNewThread(selection)) {
      skipped.push({ selection, reason: "new-thread-required" });
      continue;
    }

    const pausedUntil = yield* input.pausedUntil(selection);

    if (pausedUntil !== undefined) {
      skipped.push({ selection, reason: "paused", until: pausedUntil });
      continue;
    }

    const benchedUntil = yield* input.benchedUntil(String(selection.instanceId));

    if (benchedUntil !== undefined) {
      skipped.push({ selection, reason: "benched", until: benchedUntil });
      continue;
    }

    const inspected = yield* input.inspect(selection).pipe(Effect.result);

    if (Result.isFailure(inspected)) {
      skipped.push({ selection, reason: "unavailable", error: inspected.failure });
      continue;
    }

    return { pick: { selection, index, inspected: inspected.success }, skipped } as const;
  }

  return { pick: undefined, skipped } as const;
});

/** The soonest time any skipped entry comes back, or undefined when none has a known time. */
export const earliestUntil = (skipped: ReadonlyArray<SkippedEntry>): number | undefined => {
  let earliest: number | undefined;

  for (const entry of skipped) {
    if (entry.until !== undefined && (earliest === undefined || entry.until < earliest)) {
      earliest = entry.until;
    }
  }

  return earliest;
};
