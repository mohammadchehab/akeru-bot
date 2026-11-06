import { describe, expect, it } from "vite-plus/test";

import {
  classifyModelFailure,
  decodeProviderError,
  modelFailureInputFromError,
  type ModelFailureClass,
  type ModelFailureInput,
} from "./modelFailure.ts";

const cases: ReadonlyArray<readonly [string, ModelFailureInput, ModelFailureClass]> = [
  ["429 status", { message: "Request failed", statusCode: 429 }, "rate-limit"],
  ["too many requests", { message: "Too Many Requests" }, "rate-limit"],
  ["rate limit wording", { message: "Rate limit exceeded for gpt" }, "rate-limit"],
  ["429 in the text", { message: "HTTP 429" }, "rate-limit"],
  ["anthropic rate_limit_error", { message: "Error", errorType: "rate_limit_error" }, "rate-limit"],
  ["usage limit", { message: "You have reached your usage limit. Try again in 2h." }, "usage-limit"],
  ["quota", { message: "You exceeded your current quota" }, "usage-limit"],
  ["usage cap", { message: "Usage cap hit" }, "usage-limit"],
  ["limit reached", { message: "Daily limit reached" }, "usage-limit"],
  ["hit your limit", { message: "You've hit your weekly limit" }, "usage-limit"],
  ["spending limit", { message: "Spending limit exceeded" }, "usage-limit"],
  ["budget exceeded", { message: "budget exceeded" }, "usage-limit"],
  ["max usage", { message: "Max usage for this plan" }, "usage-limit"],
  ["usage wording beats a 429", { message: "Usage limit reached", statusCode: 429 }, "usage-limit"],
  ["insufficient_quota type", { message: "Error", errorType: "insufficient_quota" }, "usage-limit"],
  ["500", { message: "Internal error", statusCode: 500 }, "overloaded"],
  ["502", { message: "Bad gateway", statusCode: 502 }, "overloaded"],
  ["503", { message: "Unavailable", statusCode: 503 }, "overloaded"],
  ["504", { message: "Gateway timeout", statusCode: 504 }, "overloaded"],
  ["529", { message: "Overloaded", statusCode: 529 }, "overloaded"],
  ["overloaded_error type", { message: "Error", errorType: "overloaded_error" }, "overloaded"],
  ["connection reset", { message: "read ECONNRESET" }, "overloaded"],
  ["timeout", { message: "Request timed out" }, "overloaded"],
  ["socket hang up", { message: "socket hang up" }, "overloaded"],
  ["401", { message: "Nope", statusCode: 401 }, "unavailable"],
  ["403", { message: "Forbidden", statusCode: 403 }, "unavailable"],
  ["unknown model", { message: "Unknown model gpt-9" }, "unavailable"],
  ["model not found", { message: "The model `foo` does not exist", statusCode: 404 }, "unavailable"],
  ["invalid api key", { message: "Invalid API key" }, "unavailable"],
  ["bad request", { message: "Invalid parameter", statusCode: 400 }, "request"],
  ["context too long", { message: "maximum context length exceeded", statusCode: 400 }, "request"],
  ["content refused", { message: "Content blocked by safety policy", statusCode: 400 }, "request"],
  ["payload too large", { message: "Payload too large", statusCode: 413 }, "request"],
  ["unclassified", { message: "something odd happened" }, "request"],
];

describe("classifyModelFailure", () => {
  it.each(cases)("%s", (_name, input, expected) => {
    expect(classifyModelFailure(input)).toBe(expected);
  });
});

describe("modelFailureInputFromError", () => {
  it("reads status, Retry-After seconds and the provider error type", () => {
    expect(
      modelFailureInputFromError(
        decodeProviderError({
          statusCode: 429,
          responseHeaders: { "retry-after": "30" },
          data: { error: { type: "rate_limit_error" } },
        }),
        "slow down",
      ),
    ).toEqual({
      message: "slow down",
      statusCode: 429,
      retryAfterMs: 30_000,
      errorType: "rate_limit_error",
    });
  });

  it("ignores an HTTP-date Retry-After and a missing body", () => {
    expect(
      modelFailureInputFromError(
        decodeProviderError({
          statusCode: 503,
          responseHeaders: { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" },
        }),
        "busy",
      ),
    ).toEqual({ message: "busy", statusCode: 503, retryAfterMs: undefined, errorType: undefined });
  });

  it("returns only the message for anything that is not an object", () => {
    expect(modelFailureInputFromError(decodeProviderError("boom"), "boom")).toEqual({
      message: "boom",
    });
    expect(modelFailureInputFromError(decodeProviderError(undefined), "x")).toEqual({
      message: "x",
    });
  });
});
