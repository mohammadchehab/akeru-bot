import { assert, it } from "@effect/vitest";
import { ProviderInstanceId, type ModelSelection } from "@isnadi/contracts";
import * as Effect from "effect/Effect";

import { AgentControllerUnsupportedEngineError } from "../../Errors.ts";
import { earliestUntil, pickEntry, type RouterInput } from "./ModelRouter.ts";

const entry = (instance: string, model = "m"): ModelSelection => ({
  instanceId: ProviderInstanceId.make(instance),
  model,
});

const unusable = (selection: ModelSelection) =>
  new AgentControllerUnsupportedEngineError({
    provider: String(selection.instanceId),
    model: selection.model,
    detail: "not set up",
  });

/** Everything usable and allowed, so each test breaks exactly one thing. */
const open = (chain: ReadonlyArray<ModelSelection>, patch: Partial<RouterInput<string>> = {}) =>
  pickEntry<string>({
    chain,
    allowed: () => true,
    requiresNewThread: () => false,
    pausedUntil: () => Effect.succeed(undefined),
    benchedUntil: () => Effect.succeed(undefined),
    inspect: (selection) => Effect.succeed(`inspected:${selection.model}`),
    ...patch,
  });

it.effect("picks the primary when it is usable, with nothing skipped", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b")]);

    assert.strictEqual(result.pick?.selection.model, "a");
    assert.strictEqual(result.pick?.index, 0);
    assert.deepStrictEqual(result.skipped, []);
  }),
);

it.effect("keeps the order of the list", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b"), entry("grok", "c")], {
      inspect: (selection) =>
        selection.model === "a" ? Effect.fail(unusable(selection)) : Effect.succeed("ok"),
    });

    assert.strictEqual(result.pick?.selection.model, "b");
    assert.strictEqual(result.pick?.index, 1);
    assert.deepStrictEqual(
      result.skipped.map((skip) => [skip.selection.model, skip.reason]),
      [["a", "unavailable"]],
    );
  }),
);

it.effect("skips an entry that fails inspection and keeps its error", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b")], {
      inspect: (selection) =>
        selection.model === "a" ? Effect.fail(unusable(selection)) : Effect.succeed("ok"),
    });

    assert.strictEqual(result.skipped[0]?.error?._tag, "AgentControllerUnsupportedEngineError");
  }),
);

it.effect("skips a paused entry and reports when it comes back", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b")], {
      pausedUntil: (selection) => Effect.succeed(selection.model === "a" ? 5_000 : undefined),
    });

    assert.strictEqual(result.pick?.selection.model, "b");
    assert.deepStrictEqual(
      result.skipped.map((skip) => [skip.reason, skip.until]),
      [["paused", 5_000]],
    );
  }),
);

it.effect("skips a benched instance and reports when it comes back", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b")], {
      benchedUntil: (instanceId) => Effect.succeed(instanceId === "codex" ? 9_000 : undefined),
    });

    assert.strictEqual(result.pick?.selection.model, "b");
    assert.deepStrictEqual(
      result.skipped.map((skip) => [skip.reason, skip.until]),
      [["benched", 9_000]],
    );
  }),
);

it.effect("skips a fallback the policy denies, without inspecting it", () =>
  Effect.gen(function* () {
    const inspected: Array<string> = [];

    const result = yield* open([entry("codex", "a"), entry("custom", "b"), entry("claude", "c")], {
      inspect: (selection) =>
        Effect.sync(() => {
          inspected.push(selection.model);

          return "ok";
        }).pipe(
          Effect.flatMap((value) =>
            selection.model === "a" ? Effect.fail(unusable(selection)) : Effect.succeed(value),
          ),
        ),
      allowed: (selection) => selection.instanceId !== "custom",
    });

    assert.strictEqual(result.pick?.selection.model, "c");
    assert.deepStrictEqual(
      result.skipped.map((skip) => [skip.selection.model, skip.reason]),
      [
        ["a", "unavailable"],
        ["b", "policy-denied"],
      ],
    );
    assert.deepStrictEqual(inspected, ["a", "c"]);
  }),
);

it.effect("never runs the policy on the primary", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("custom", "a")], { allowed: () => false });

    assert.strictEqual(result.pick?.selection.model, "a");
  }),
);

it.effect("skips a cross-instance entry that needs a new thread", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b"), entry("grok", "c")], {
      pausedUntil: (selection) => Effect.succeed(selection.model === "a" ? 1 : undefined),
      requiresNewThread: (selection) => selection.instanceId === "claude",
    });

    assert.strictEqual(result.pick?.selection.model, "c");
    assert.deepStrictEqual(
      result.skipped.map((skip) => skip.reason),
      ["paused", "new-thread-required"],
    );
  }),
);

it.effect("returns no pick when every entry is skipped", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b")], {
      pausedUntil: (selection) => Effect.succeed(selection.model === "a" ? 7_000 : 3_000),
    });

    assert.strictEqual(result.pick, undefined);
    assert.strictEqual(earliestUntil(result.skipped), 3_000);
  }),
);

it.effect("reports no resume time when nothing skipped has one", () =>
  Effect.gen(function* () {
    const result = yield* open([entry("codex", "a"), entry("claude", "b")], {
      inspect: (selection) => Effect.fail(unusable(selection)),
    });

    assert.strictEqual(result.pick, undefined);
    assert.strictEqual(earliestUntil(result.skipped), undefined);
    assert.strictEqual(result.skipped[0]?.error?._tag, "AgentControllerUnsupportedEngineError");
  }),
);
