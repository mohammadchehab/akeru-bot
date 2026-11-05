import * as Predicate from "effect/Predicate";

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

export const RATE_LIMIT_PATTERN = /rate limit|too many requests|\b429\b/i;

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

/**
 * Reads the fields the classifier uses off an error thrown by the AI SDK (`APICallError`) without
 * importing it. Anything that is not shaped like one yields only the message.
 */
export function modelFailureInputFromError(error: unknown, message: string): ModelFailureInput {
  if (!Predicate.isObject(error)) return { message };

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
  const headers =
    "responseHeaders" in error && Predicate.isObject(error.responseHeaders)
      ? error.responseHeaders
      : undefined;
  const retryAfter = headers && "retry-after" in headers ? Number(headers["retry-after"]) : NaN;
  const data = "data" in error && Predicate.isObject(error.data) ? error.data : undefined;
  const nested = data && "error" in data && Predicate.isObject(data.error) ? data.error : data;
  const errorType =
    nested && "type" in nested && typeof nested.type === "string" ? nested.type : undefined;

  return {
    message,
    statusCode,
    retryAfterMs: Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1_000 : undefined,
    errorType,
  };
}
