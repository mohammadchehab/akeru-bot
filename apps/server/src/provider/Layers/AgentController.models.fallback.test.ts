import { it } from "@effect/vitest";
import { type BotEngine } from "@isnadi/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Fiber from "effect/Fiber";
import * as Predicate from "effect/Predicate";
import * as Stream from "effect/Stream";
import { assert, describe } from "vite-plus/test";

import { AgentController } from "../Services/AgentController.ts";
import {
  claudeInstanceId,
  claudeThreadId,
  codexInstanceId,
  codexSelection,
} from "./test-support/agentControllerFixtures.ts";
import { makeBridge, provideController } from "./test-support/agentControllerLayers.ts";
import { mastraHarnessFixture } from "./test-support/agentControllerHarness.ts";

const engine = (fallbacks: BotEngine["fallbacks"]): BotEngine => ({
  provider: String(claudeInstanceId),
  model: "claude-opus-4-6",
  fallbacks,
});

const codexFallback = {
  provider: String(codexInstanceId),
  model: codexSelection.model,
  historyConsent: true,
};

const resolve = (controller: AgentController["Service"], fallbacks: BotEngine["fallbacks"]) =>
  controller.resolveEngine({
    threadId: claudeThreadId,
    engine: engine(fallbacks),
    fallback: codexSelection,
    mode: "default",
    botConversation: true,
  });

describe("AgentController model fallback at turn start", () => {
  it.effect("runs the turn on the next model when the primary is disabled", () => {
    const bridge = makeBridge();
    const mastra = mastraHarnessFixture();

    return provideController(
      Effect.gen(function* () {
        const controller = yield* AgentController;
        bridge.disableInstance(String(claudeInstanceId));

        const reroutedFiber = yield* controller.streamEvents.pipe(
          Stream.filter((event) => event.type === "model.rerouted"),
          Stream.runHead,
          Effect.forkChild({ startImmediately: true }),
        );

        // The merged event stream subscribes from forked fibers; let them reach the PubSub.
        yield* Effect.forEach(Array.from({ length: 8 }), () => Effect.yieldNow);

        const selection = yield* resolve(controller, [codexFallback]);
        const rerouted = Option.getOrUndefined(yield* Fiber.join(reroutedFiber));

        assert.equal(selection.modelSelection.instanceId, codexInstanceId);

        if (rerouted?.type !== "model.rerouted") {
          return assert.fail("expected a model.rerouted event");
        }

        assert.equal(rerouted.payload.fromInstanceId, String(claudeInstanceId));
        assert.equal(rerouted.payload.toInstanceId, String(codexInstanceId));
      }),
      bridge.service,
      mastra.factory,
    );
  });

  it.effect(
    "keeps the primary's own error when no fallback can run and nothing will recover",
    () => {
      const bridge = makeBridge();
      const mastra = mastraHarnessFixture();

      return provideController(
        Effect.gen(function* () {
          const controller = yield* AgentController;
          bridge.disableInstance(String(claudeInstanceId));
          bridge.disableInstance(String(codexInstanceId));

          const error = yield* resolve(controller, [codexFallback]).pipe(Effect.flip);

          assert.equal(error._tag, "ProviderValidationError");

          if (Predicate.isTagged(error, "ProviderValidationError")) {
            assert.include(error.issue, "disabled in IsnadiBot settings");
          }
        }),
        bridge.service,
        mastra.factory,
      );
    },
  );
});
