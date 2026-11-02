import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import {
  GROUP_HOP_BUDGET_DEFAULT,
  GROUP_HOP_BUDGET_MAX,
  GROUP_HOP_BUDGET_MIN,
} from "./orchestration.ts";
import {
  decodeOrchestrationCommand,
  decodeOrchestrationEvent,
} from "./orchestration.test-support.ts";

const setCommand = (hopBudget: number) => ({
  type: "thread.hop-budget.set",
  commandId: "cmd-hop-budget",
  threadId: "thread-1",
  hopBudget,
  createdAt: "2026-01-01T00:00:00.000Z",
});

it.effect("keeps the default hop budget inside the allowed range", () =>
  Effect.sync(() => {
    assert.isTrue(GROUP_HOP_BUDGET_MIN <= GROUP_HOP_BUDGET_DEFAULT);
    assert.isTrue(GROUP_HOP_BUDGET_DEFAULT <= GROUP_HOP_BUDGET_MAX);
    assert.strictEqual(GROUP_HOP_BUDGET_DEFAULT, 6);
  }),
);

it.effect("accepts a hop budget from 1 to 20 and nothing outside it", () =>
  Effect.gen(function* () {
    for (const hopBudget of [GROUP_HOP_BUDGET_MIN, 2, GROUP_HOP_BUDGET_MAX]) {
      const decoded = yield* decodeOrchestrationCommand(setCommand(hopBudget));
      assert.strictEqual(decoded.type, "thread.hop-budget.set");
    }

    for (const hopBudget of [0, -1, GROUP_HOP_BUDGET_MAX + 1, 2.5]) {
      const failed = yield* Effect.flip(decodeOrchestrationCommand(setCommand(hopBudget)));
      assert.isDefined(failed);
    }
  }),
);

it.effect("decodes the hop budget event", () =>
  Effect.gen(function* () {
    const event = yield* decodeOrchestrationEvent({
      sequence: 1,
      eventId: "event-1",
      aggregateKind: "thread",
      aggregateId: "thread-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      commandId: null,
      causationEventId: null,
      correlationId: null,
      metadata: {},
      type: "thread.hop-budget-set",
      payload: { threadId: "thread-1", hopBudget: 3, updatedAt: "2026-01-01T00:00:00.000Z" },
    });

    assert.strictEqual(event.type, "thread.hop-budget-set");
  }),
);
