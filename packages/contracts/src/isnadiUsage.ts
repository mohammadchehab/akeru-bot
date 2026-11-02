import * as Schema from "effect/Schema";

import {
  IsnadiUsageReservationId,
  BotId,
  IsoDateTime,
  NonNegativeInt,
  ThreadId,
  TrimmedNonEmptyString,
  TurnId,
} from "./baseSchemas.ts";
import { ProviderDriverKind } from "./providerInstance.ts";
import { BotEngine } from "./orchestration/roster.ts";

export const IsnadiUsageCategory = Schema.Literals([
  "turn",
  "tool",
  "observer",
  "reflector",
  "extraction",
  "recall",
  "routine",
  "delegated",
]);

export type IsnadiUsageCategory = typeof IsnadiUsageCategory.Type;

export const IsnadiUsageState = Schema.Literals([
  "reserved",
  "reported",
  "unavailable",
  "released",
]);

export type IsnadiUsageState = typeof IsnadiUsageState.Type;

export const IsnadiUsageEntry = Schema.Struct({
  reservationId: IsnadiUsageReservationId,
  sourceKey: TrimmedNonEmptyString,
  botId: BotId,
  threadId: Schema.NullOr(ThreadId),
  turnId: Schema.NullOr(TurnId),
  category: IsnadiUsageCategory,
  state: IsnadiUsageState,
  reservedTokens: NonNegativeInt,
  inputTokens: Schema.NullOr(NonNegativeInt),
  cachedInputTokens: Schema.optional(NonNegativeInt),
  cacheCreationTokens: Schema.optional(NonNegativeInt),
  outputTokens: Schema.NullOr(NonNegativeInt),
  reasoningTokens: Schema.NullOr(NonNegativeInt),
  provider: Schema.NullOr(ProviderDriverKind),
  model: Schema.NullOr(TrimmedNonEmptyString),
  unavailableReason: Schema.NullOr(TrimmedNonEmptyString),
  createdAt: IsoDateTime,
  settledAt: Schema.NullOr(IsoDateTime),
});

export type IsnadiUsageEntry = typeof IsnadiUsageEntry.Type;

export const IsnadiBotUsageSummary = Schema.Struct({
  botId: BotId,
  consumedTokens: NonNegativeInt,
  reservedTokens: NonNegativeInt,
  measurements: Schema.Struct({
    input: Schema.Struct({ tokens: NonNegativeInt, unavailableEntries: NonNegativeInt }),
    output: Schema.Struct({ tokens: NonNegativeInt, unavailableEntries: NonNegativeInt }),
    observer: Schema.Struct({ tokens: NonNegativeInt, unavailableEntries: NonNegativeInt }),
    reflector: Schema.Struct({ tokens: NonNegativeInt, unavailableEntries: NonNegativeInt }),
  }),
  entries: Schema.Array(IsnadiUsageEntry),
});

export type IsnadiBotUsageSummary = typeof IsnadiBotUsageSummary.Type;

export const IsnadiBotUsageInput = Schema.Struct({ botId: BotId });

export type IsnadiBotUsageInput = typeof IsnadiBotUsageInput.Type;

export const IsnadiEstimatedCost = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("available"),
    usd: Schema.Number.check(Schema.isFinite(), Schema.isGreaterThanOrEqualTo(0)),
  }),
  Schema.Struct({ status: Schema.Literal("unavailable"), usd: Schema.Null }),
]);

export type IsnadiEstimatedCost = typeof IsnadiEstimatedCost.Type;

export const IsnadiStepUsageSnapshot = Schema.Struct({
  botId: BotId,
  engine: BotEngine,
  tokens: Schema.NullOr(NonNegativeInt),
  estimatedCost: IsnadiEstimatedCost,
});

export type IsnadiStepUsageSnapshot = typeof IsnadiStepUsageSnapshot.Type;

export const IsnadiBotUsageSnapshot = Schema.Struct({
  ...IsnadiBotUsageSummary.fields,
  estimatedCost: IsnadiEstimatedCost,
  subscriptionPool: Schema.Union([
    Schema.Struct({
      status: Schema.Literal("available"),
      used: NonNegativeInt,
      limit: NonNegativeInt,
      unit: TrimmedNonEmptyString,
    }),
    Schema.Struct({
      status: Schema.Literal("unavailable"),
      used: Schema.Null,
      limit: Schema.Null,
      unit: Schema.Null,
    }),
  ]),
});

export type IsnadiBotUsageSnapshot = typeof IsnadiBotUsageSnapshot.Type;

export class IsnadiBotUsageReadError extends Schema.TaggedErrorClass<IsnadiBotUsageReadError>()(
  "IsnadiBotUsageReadError",
  { botId: BotId, detail: TrimmedNonEmptyString },
) {}
