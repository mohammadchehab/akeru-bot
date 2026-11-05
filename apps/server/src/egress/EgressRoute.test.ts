import { assert, it } from "@effect/vitest";
import { isEgressStreamRequest } from "./EgressRoute.ts";

it("the tracer skips stream requests, whose url carries the ticket, and nothing else", () => {
  assert.isTrue(isEgressStreamRequest({ url: "/egress/stream/s1?ticket=secret" }));
  assert.isFalse(isEgressStreamRequest({ url: "/egress" }));
  assert.isFalse(isEgressStreamRequest({ url: "/api/auth/session" }));
});
