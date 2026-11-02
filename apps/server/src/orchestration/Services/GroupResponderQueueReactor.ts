/**
 * GroupResponderQueueReactor - Starts the next queued bot of a group chat when a turn ends.
 *
 * @module GroupResponderQueueReactor
 */
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";

export interface GroupResponderQueueReactorShape {
  /**
   * Start reacting to session and queue domain events. Run in a scope so the worker fibers are
   * finalized on shutdown.
   */
  readonly start: () => Effect.Effect<void, never, Scope.Scope>;

  /**
   * Resolves when the internal processing queue is empty and idle.
   * Intended for tests, in place of sleeps.
   */
  readonly drain: Effect.Effect<void>;

  /**
   * Resolves once every domain event at or before `sequence` has been observed and any next-bot
   * request they caused has been handed to the worker and finished.
   */
  readonly drainThrough: (sequence: number) => Effect.Effect<void>;
}

export class GroupResponderQueueReactor extends Context.Service<
  GroupResponderQueueReactor,
  GroupResponderQueueReactorShape
>()("isnadibot/orchestration/Services/GroupResponderQueueReactor") {}
