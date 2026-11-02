import {
  IsnadiBotUsageSummary,
  IsnadiUsageEntry,
  type IsnadiUsageCategory,
  type IsnadiUsageReservationId,
  type BotId,
  type ProviderDriverKind,
  type ThreadId,
  type TurnId,
} from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import { type PersistenceDecodeError, PersistenceSqlError } from "../persistence/Errors.ts";

export const ISNADI_TURN_USAGE_RESERVATION_TOKENS = 32_000;

export interface ReserveBotUsageInput {
  readonly reservationId: IsnadiUsageReservationId;
  readonly sourceKey: string;
  readonly botId: BotId;
  readonly threadId: ThreadId | null;
  readonly turnId: TurnId | null;
  readonly category: IsnadiUsageCategory;
  readonly maximumTokens: number;
  readonly provider: ProviderDriverKind | null;
  readonly model: string | null;
  readonly createdAt: string;
}

export type SettleBotUsageDetails =
  | {
      readonly state: "reported";
      readonly inputTokens: number;
      readonly cachedInputTokens?: number;
      readonly cacheCreationTokens?: number;
      readonly outputTokens: number;
      readonly reasoningTokens: number | null;
    }
  | { readonly state: "unavailable"; readonly reason: string }
  | { readonly state: "released" };

export type SettleBotUsageInput = SettleBotUsageDetails & {
  readonly reservationId: IsnadiUsageReservationId;
  readonly settledAt: string;
};

export type SettleBotUsageForTurnInput = SettleBotUsageDetails & {
  readonly botId: BotId;
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly settledAt: string;
};

export type BotUsageLedgerError = PersistenceSqlError | PersistenceDecodeError;

export interface BotUsageLedgerShape {
  readonly pricingTotals: (botId: BotId) => Effect.Effect<
    {
      readonly complete: boolean;
      readonly models: ReadonlyArray<{
        readonly model: string;
        readonly inputTokens: number;
        readonly cachedInputTokens: number;
        readonly cacheCreationTokens: number;
        readonly outputTokens: number;
        readonly reasoningTokens: number;
      }>;
    },
    BotUsageLedgerError
  >;
  readonly reserve: (
    input: ReserveBotUsageInput,
  ) => Effect.Effect<IsnadiUsageEntry, BotUsageLedgerError>;
  readonly settle: (
    input: SettleBotUsageInput,
  ) => Effect.Effect<IsnadiUsageEntry, BotUsageLedgerError>;
  readonly bindTurn: (input: {
    readonly reservationId: IsnadiUsageReservationId;
    readonly turnId: TurnId;
  }) => Effect.Effect<IsnadiUsageEntry, BotUsageLedgerError>;
  readonly settleForTurn: (
    input: SettleBotUsageForTurnInput,
  ) => Effect.Effect<ReadonlyArray<IsnadiUsageEntry>, BotUsageLedgerError>;
  readonly finalizeForTurn: (input: {
    readonly botId: BotId;
    readonly threadId: ThreadId;
    readonly turnId: TurnId;
    readonly settledAt: string;
    readonly cancelled?: boolean;
  }) => Effect.Effect<ReadonlyArray<IsnadiUsageEntry>, BotUsageLedgerError>;
  readonly recordMeasurement: (input: {
    readonly reservationId: IsnadiUsageReservationId;
    readonly sourceKey: string;
    readonly botId: BotId;
    readonly threadId: ThreadId | null;
    readonly turnId: TurnId | null;
    readonly category: IsnadiUsageCategory;
    readonly inputTokens: number;
    readonly cachedInputTokens?: number;
    readonly cacheCreationTokens?: number;
    readonly outputTokens: number;
    readonly reasoningTokens: number | null;
    readonly provider: ProviderDriverKind | null;
    readonly model: string | null;
    readonly includedInReservation?: boolean;
    readonly createdAt: string;
  }) => Effect.Effect<IsnadiUsageEntry, BotUsageLedgerError>;
  /** Records work that charges no tokens so a restart before it settles marks it interrupted. */
  readonly recordStart: (
    input: Omit<ReserveBotUsageInput, "maximumTokens">,
  ) => Effect.Effect<IsnadiUsageEntry, BotUsageLedgerError>;
  readonly summarize: (botId: BotId) => Effect.Effect<IsnadiBotUsageSummary, BotUsageLedgerError>;
}
