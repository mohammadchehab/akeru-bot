import { CommandId, ThreadId, type OrchestrationEvent } from "@isnadi/contracts";
import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import { decideOrchestrationCommand } from "./decider.ts";
import { projectEvent } from "./projector.ts";
import {
  NOW,
  makeGroup,
  makeGroupThread,
  makeReadModel,
} from "./test-support/GroupDeciderFixtures.ts";

const setHopBudget = (hopBudget: number, threadId = "thread-group") => ({
  type: "thread.hop-budget.set" as const,
  commandId: CommandId.make("cmd-hop-budget"),
  threadId: ThreadId.make(threadId),
  hopBudget,
  createdAt: NOW,
});

it.layer(NodeServices.layer)("group chat hop budget decider", (it) => {
  it.effect("records the budget on a group chat, and the projection keeps it", () =>
    Effect.gen(function* () {
      const model = makeReadModel({ groups: [makeGroup()], threads: [makeGroupThread()] });

      const result = yield* decideOrchestrationCommand({
        command: setHopBudget(3),
        readModel: model,
      });

      const event = Array.isArray(result) ? result[0] : result;

      if (event?.type !== "thread.hop-budget-set") throw new Error("Expected hop budget event");
      expect(event.payload).toEqual({
        threadId: ThreadId.make("thread-group"),
        hopBudget: 3,
        updatedAt: NOW,
      });

      const projected = yield* projectEvent(model, { ...event, sequence: 1 } as OrchestrationEvent);

      expect(projected.threads[0]?.hopBudget).toBe(3);
    }),
  );

  it.effect("refuses a chat that is not a group chat", () =>
    Effect.gen(function* () {
      const direct = { ...makeGroupThread(), groupId: null };

      const error = yield* decideOrchestrationCommand({
        command: setHopBudget(3),
        readModel: makeReadModel({ groups: [makeGroup()], threads: [direct] }),
      }).pipe(Effect.flip);

      expect(String(error)).toContain("not a group chat");
    }),
  );

  it.effect("refuses a chat that does not exist", () =>
    Effect.gen(function* () {
      const error = yield* decideOrchestrationCommand({
        command: setHopBudget(3, "thread-missing"),
        readModel: makeReadModel({ groups: [makeGroup()], threads: [makeGroupThread()] }),
      }).pipe(Effect.flip);

      expect(String(error)).toContain("thread-missing");
    }),
  );
});
