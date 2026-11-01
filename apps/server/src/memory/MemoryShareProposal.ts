import {
  IsnadiMemoryCandidateId,
  IsnadiMemoryRootId,
  type IsnadiMemoryCandidateDecision,
  type IsnadiMemoryDecisionReceipt,
  type IsnadiMemoryShareScope,
  type IsnadiMemoryTargetScope,
  type IsnadiMemoryThreadAccess,
} from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export class MemoryApprovalError extends Schema.TaggedErrorClass<MemoryApprovalError>()(
  "MemoryApprovalError",
  { message: Schema.String },
) {}

export interface MemoryShareProposal {
  readonly access: IsnadiMemoryThreadAccess;
  readonly fact: string;
  readonly scope: IsnadiMemoryShareScope;
  readonly sensitive: boolean;
  // "auto" saves non-sensitive shared facts without asking.
  readonly mode: "ask" | "auto";
}

export type MemoryShareResult =
  | { readonly status: "saved"; readonly memoryId: IsnadiMemoryRootId }
  | { readonly status: "pending"; readonly candidateId: IsnadiMemoryCandidateId };

export interface MemoryApprovalsShape {
  // Called by the memory tool when a bot wants to save a shared fact.
  readonly propose: (
    input: MemoryShareProposal,
  ) => Effect.Effect<MemoryShareResult, MemoryApprovalError>;
  // Called when a person approves or rejects a pending candidate from the
  // chat card or the bot inbox. Deciding twice returns the first receipt.
  readonly decide: (input: {
    readonly access: IsnadiMemoryThreadAccess;
    readonly decision: IsnadiMemoryCandidateDecision;
  }) => Effect.Effect<IsnadiMemoryDecisionReceipt, MemoryApprovalError>;
}

export const memoryApprovalIncidentKey = (candidateId: string) => `memory-approval:${candidateId}`;

export const SCOPE_LABELS: Record<IsnadiMemoryTargetScope, string> = {
  private: "private",
  bot: "this bot's",
  project: "project",
  group: "group",
  workspace: "workspace",
};

export const INBOX_SUMMARY_MAX_CHARS = 240;

export const boundedSummary = (value: string) =>
  value.length <= INBOX_SUMMARY_MAX_CHARS
    ? value
    : `${value.slice(0, INBOX_SUMMARY_MAX_CHARS - 1)}…`;
