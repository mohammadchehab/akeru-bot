import {
  GROUP_HOP_BUDGET_DEFAULT,
  GROUP_HOP_BUDGET_MAX,
  GROUP_HOP_BUDGET_MIN,
  GroupHopBudget,
} from "@isnadi/contracts";

/** The budget a group chat runs with: its own setting, or the default when it never set one. */
export function effectiveHopBudget(hopBudget: number | undefined): number {
  return hopBudget ?? GROUP_HOP_BUDGET_DEFAULT;
}

/**
 * One stepper press from `current`, or null when the press would leave the allowed range.
 * The stepper disables the matching button on null, so the client never sends an invalid budget.
 */
export function stepHopBudget(current: number, direction: 1 | -1): GroupHopBudget | null {
  const next = current + direction;

  if (next < GROUP_HOP_BUDGET_MIN || next > GROUP_HOP_BUDGET_MAX) return null;

  return GroupHopBudget.make(next);
}
