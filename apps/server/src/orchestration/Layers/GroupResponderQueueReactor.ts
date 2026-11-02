import { CommandId, type OrchestrationEvent, type ThreadId } from "@isnadi/contracts";
import { makeDrainableWorker } from "@isnadi/shared/DrainableWorker";
import * as Cause from "effect/Cause";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { forkParked } from "../../serverActivation.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import {
  GroupResponderQueueReactor,
  type GroupResponderQueueReactorShape,
} from "../Services/GroupResponderQueueReactor.ts";

/**
 * Runs a group chat's responder queue, one bot at a time. The decider fills the queue when a
 * message is addressed; this reactor notices when a queued chat's session is not running and asks
 * the decider to start the next bot. The decider is the authority: it ignores the request when the
 * queue is empty or the turn it last started is still in flight.
 *
 * A restart can leave a queue persisted with nobody running. No session event will follow, so
 * start reads the persisted queues once and advances every one that is not mid-turn.
 */
const make = Effect.gen(function* () {
  const orchestrationEngine = yield* OrchestrationEngineService;
  const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
  const crypto = yield* Crypto.Crypto;

  // Threads that still have someone waiting.
  const queued = new Set<ThreadId>();

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
  // Completes once the persisted queues have been read and any waiting chat has been enqueued.
  const restored = yield* Deferred.make<void>();

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

      return Effect.void;
    }

    if (event.type !== "thread.session-set") return Effect.void;

    // Any session that is not running may mean the last bot is done, or never got going (a
    // provider that fails to start goes starting -> error). The decider ignores the request
    // while the started turn is still in flight, so asking early is harmless.
    const threadId = event.payload.threadId;

    return event.payload.session.status !== "running" && queued.has(threadId)
      ? worker.enqueue(threadId)
      : Effect.void;
  };

  const restoreQueues = projectionSnapshotQuery.getCommandReadModel().pipe(
    Effect.flatMap((readModel) =>
      Effect.forEach(
        readModel.threads,
        (thread) => {
          if (thread.deletedAt !== null || (thread.responderQueue?.entries.length ?? 0) === 0) {
            return Effect.void;
          }

          queued.add(thread.id);

          return thread.session?.status === "running" ? Effect.void : worker.enqueue(thread.id);
        },
        { discard: true },
      ),
    ),
    Effect.catchCause((cause) =>
      Cause.hasInterruptsOnly(cause)
        ? Effect.failCause(cause)
        : Effect.logWarning("group responder queue could not restore waiting chats", {
            cause: Cause.pretty(cause),
          }),
    ),
    Effect.ensuring(Deferred.succeed(restored, undefined)),
  );

  const drainRestored = Deferred.await(restored).pipe(Effect.andThen(worker.drain));

  const start: GroupResponderQueueReactorShape["start"] = Effect.fn("start")(function* () {
    // Subscribe before reading so no event between the read and the first delivery is missed.
    // A duplicate advance is harmless: the decider ignores it when the queue is empty or running.
    const domainEvents = yield* orchestrationEngine.subscribeDomainEvents;
    yield* forkParked(
      Stream.runForEach(domainEvents, (event) =>
        observe(event).pipe(Effect.andThen(noteSeen(event.sequence))),
      ),
    );
    yield* forkParked(restoreQueues);
  });

  const drainThrough: GroupResponderQueueReactorShape["drainThrough"] = Effect.fn(
    "GroupResponderQueueReactor.drainThrough",
  )(function* (target) {
    yield* SubscriptionRef.changes(seenSequence).pipe(
      Stream.filter((seen) => seen >= target),
      Stream.runHead,
    );
    yield* drainRestored;
  });

  return { start, drain: drainRestored, drainThrough } satisfies GroupResponderQueueReactorShape;
});

export const GroupResponderQueueReactorLive = Layer.effect(GroupResponderQueueReactor, make);
