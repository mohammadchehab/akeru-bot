import { CommandId, type OrchestrationEvent, type ThreadId } from "@isnadi/contracts";
import { makeDrainableWorker } from "@isnadi/shared/DrainableWorker";
import * as Cause from "effect/Cause";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { forkParked } from "../../serverActivation.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import {
  GroupResponderQueueReactor,
  type GroupResponderQueueReactorShape,
} from "../Services/GroupResponderQueueReactor.ts";

/**
 * Runs a group chat's responder queue, one bot at a time. The decider fills the queue when a
 * message is addressed; this reactor notices the moment the running bot finishes (a session going
 * from running to anything else) and asks the decider to start the next one. The decider is the
 * authority: it ignores the request when the queue is empty or a turn is still running.
 */
const make = Effect.gen(function* () {
  const orchestrationEngine = yield* OrchestrationEngineService;
  const crypto = yield* Crypto.Crypto;

  // Per thread: whether anyone is still queued, and the last session status seen.
  const queued = new Set<ThreadId>();
  const lastStatus = new Map<ThreadId, string>();

  const advance = (threadId: ThreadId) =>
    crypto.randomUUIDv4.pipe(
      Effect.flatMap((uuid) =>
        DateTime.now.pipe(
          Effect.flatMap((now) =>
            orchestrationEngine.dispatch({
              type: "thread.responder.advance",
              commandId: CommandId.make(`server:responder-advance:${uuid}`),
              threadId,
              createdAt: DateTime.formatIso(now),
            }),
          ),
        ),
      ),
      Effect.asVoid,
      Effect.catchCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.failCause(cause)
          : Effect.logWarning("group responder queue could not start the next bot", {
              threadId,
              cause: Cause.pretty(cause),
            }),
      ),
    );

  const worker = yield* makeDrainableWorker(advance);
  const seenSequence = yield* SubscriptionRef.make(0);

  const noteSeen = (sequence: number) =>
    SubscriptionRef.update(seenSequence, (seen) => Math.max(seen, sequence));

  const observe = (event: OrchestrationEvent): Effect.Effect<void> => {
    if (event.type === "thread.responder-queue.set") {
      if (event.payload.entries.length > 0) queued.add(event.payload.threadId);
      else queued.delete(event.payload.threadId);

      return Effect.void;
    }

    if (event.type === "thread.deleted") {
      queued.delete(event.payload.threadId);
      lastStatus.delete(event.payload.threadId);

      return Effect.void;
    }

    if (event.type !== "thread.session-set") return Effect.void;

    const threadId = event.payload.threadId;
    const status = event.payload.session.status;
    const wasRunning = lastStatus.get(threadId) === "running";
    lastStatus.set(threadId, status);

    return wasRunning && status !== "running" && queued.has(threadId)
      ? worker.enqueue(threadId)
      : Effect.void;
  };

  const start: GroupResponderQueueReactorShape["start"] = Effect.fn("start")(function* () {
    // Subscribe before returning so no event between start and the first read is missed.
    const domainEvents = yield* orchestrationEngine.subscribeDomainEvents;
    yield* forkParked(
      Stream.runForEach(domainEvents, (event) =>
        observe(event).pipe(Effect.andThen(noteSeen(event.sequence))),
      ),
    );
  });

  const drainThrough: GroupResponderQueueReactorShape["drainThrough"] = Effect.fn(
    "GroupResponderQueueReactor.drainThrough",
  )(function* (target) {
    yield* SubscriptionRef.changes(seenSequence).pipe(
      Stream.filter((seen) => seen >= target),
      Stream.runHead,
    );
    yield* worker.drain;
  });

  return { start, drain: worker.drain, drainThrough } satisfies GroupResponderQueueReactorShape;
});

export const GroupResponderQueueReactorLive = Layer.effect(GroupResponderQueueReactor, make);
