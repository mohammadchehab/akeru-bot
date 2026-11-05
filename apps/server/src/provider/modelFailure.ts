import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/**
 * Why a model call failed, as far as the fallback router cares. `rate-limit`, `usage-limit`,
 * `overloaded` and `unavailable` may move a turn to another model; `request` never does, because
 * another model would most likely fail the same way. See docs/internals/model-fallback.md.
 */
export type ModelFailureClass =
  | "rate-limit"
  | "usage-limit"
  | "overloaded"
  | "unavailable"
  | "request";

export interface ModelFailureInput {
  readonly message: string;
  readonly statusCode?: number | undefined;
  /** Seconds-form `Retry-After`, in milliseconds. Carried for the pause; it does not change the class. */
  readonly retryAfterMs?: number | undefined;
  /** The provider's own error type, for example Anthropic's `overloaded_error`. */
  readonly errorType?: string | undefined;
}

export const RATE_LIMIT_PATTERN = /rate[\s_-]?limit|too many requests|\b429\b/i;

export const USAGE_LIMIT_PATTERN =
  /usage limit|quota|usage cap|limit reached|hit your .*limit|spending limit|budget exceeded|max usage/i;

const OVERLOADED_STATUS = new Set([500, 502, 503, 504, 529]);

const OVERLOADED_PATTERN =
  /overloaded|service unavailable|econnreset|connection reset|etimedout|timed out|timeout|socket hang up/i;

const UNAVAILABLE_PATTERN =
  /unknown model|no such model|model\b[^.]*\b(?:not found|does not exist)|invalid api key|unauthorized/i;

/**
 * Sorts one failed model call into a class. Usage wording is checked first because it carries a
 * reset time; a status code decides only when the wording does not.
 */
export function classifyModelFailure(input: ModelFailureInput): ModelFailureClass {
  const text = input.errorType ? `${input.message} ${input.errorType}` : input.message;

  if (USAGE_LIMIT_PATTERN.test(text)) return "usage-limit";
  if (input.statusCode === 429 || RATE_LIMIT_PATTERN.test(text)) return "rate-limit";
  if (
    (input.statusCode !== undefined && OVERLOADED_STATUS.has(input.statusCode)) ||
    OVERLOADED_PATTERN.test(text)
  ) {
    return "overloaded";
  }
  if (input.statusCode === 401 || input.statusCode === 403 || UNAVAILABLE_PATTERN.test(text)) {
    return "unavailable";
  }

  return "request";
}

const ProviderErrorShape = Schema.Struct({
  statusCode: Schema.optional(Schema.Number),
  responseHeaders: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  data: Schema.optional(
    Schema.Struct({
      type: Schema.optional(Schema.String),
      error: Schema.optional(Schema.Struct({ type: Schema.optional(Schema.String) })),
    }),
  ),
});

const decodeProviderError = Schema.decodeUnknownOption(ProviderErrorShape);

/**
 * Reads the fields the classifier uses off an error thrown by the AI SDK (`APICallError`) without
 * importing it. Anything that is not shaped like one yields only the message.
 */
export function modelFailureInputFromError(error: unknown, message: string): ModelFailureInput {
  const parsed = decodeProviderError(error);

  if (Option.isNone(parsed)) return { message };

  const { statusCode, responseHeaders, data } = parsed.value;
  const retryAfter = Number(responseHeaders?.["retry-after"]);

  return {
    message,
    statusCode,
    retryAfterMs: Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1_000 : undefined,
    errorType: data?.error?.type ?? data?.type,
  };
}
