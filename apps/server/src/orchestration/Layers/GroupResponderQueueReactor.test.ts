import { it } from "@effect/vitest";
import {
  BotId,
  EventId,
  MessageId,
  ThreadId,
  type OrchestrationCommand,
  type OrchestrationEvent,
} from "@isnadi/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PubSub from "effect/PubSub";
import * as Stream from "effect/Stream";
import { describe, expect } from "vite-plus/test";

import { ServerActivation } from "../../serverActivation.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import { GroupResponderQueueReactor } from "../Services/GroupResponderQueueReactor.ts";
import { GroupResponderQueueReactorLive } from "./GroupResponderQueueReactor.ts";

const THREAD = ThreadId.make("thread-group");

const OTHER_THREAD = ThreadId.make("thread-other");

const NOW = "2026-01-01T00:00:00.000Z";

const base = (sequence: number, threadId: ThreadId) => ({
  sequence,
  eventId: EventId.make(`event-${sequence}`),
  aggregateKind: "thread" as const,
  aggregateId: threadId,
  occurredAt: NOW,
  commandId: null,
  causationEventId: null,
  correlationId: null,
  metadata: {},
});

const queueSet = (sequence: number, threadId: ThreadId, botIds: ReadonlyArray<string>) =>
  ({
    ...base(sequence, threadId),
    type: "thread.responder-queue.set",
    payload: {
      threadId,
      entries: botIds.map((botId) => ({
        botId: BotId.make(botId),
        trigger: { kind: "user" as const, messageId: MessageId.make("message-1") },
      })),
      hopsLeft: 6,
      reason: "addressed" as const,
      updatedAt: NOW,
    },
  }) satisfies OrchestrationEvent;

const sessionSet = (sequence: number, threadId: ThreadId, status: "running" | "ready") =>
  ({
    ...base(sequence, threadId),
    type: "thread.session-set",
    payload: {
      threadId,
      session: {
        threadId,
        status,
        providerName: "codex",
        runtimeMode: "full-access",
        activeTurnId: null,
        lastError: null,
        updatedAt: NOW,
      },
    },
  }) satisfies OrchestrationEvent;

const harness = Effect.gen(function* () {
  const dispatched: OrchestrationCommand[] = [];
  const events = yield* PubSub.unbounded<OrchestrationEvent>();

  const engine: OrchestrationEngineService["Service"] = {
    readEvents: () => Stream.die("unused"),
    readThreadEvents: () => Stream.die("unused"),
    getThreadReplayStats: () => Effect.die("unused"),
    dispatch: (command) =>
      Effect.sync(() => {
        dispatched.push(command);

        return { sequence: dispatched.length };
      }),
    get streamDomainEvents() {
      return Stream.die("start should subscribe") as Stream.Stream<OrchestrationEvent>;
    },
    subscribeDomainEvents: PubSub.subscribe(events).pipe(Effect.map(Stream.fromSubscription)),
    latestSequence: Effect.succeed(0),
  };

  const activation = yield* Deferred.make<void>();
  yield* Deferred.succeed(activation, undefined);

  return { dispatched, events, engine, activation };
});

const run = <A, E>(
  h: Effect.Success<typeof harness>,
  body: (reactor: GroupResponderQueueReactor["Service"]) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const reactor = yield* GroupResponderQueueReactor;
    yield* reactor.start();

    return yield* body(reactor);
  }).pipe(
    Effect.provideService(ServerActivation, Deferred.await(h.activation)),
    Effect.provide(
      GroupResponderQueueReactorLive.pipe(
        Layer.provide(Layer.succeed(OrchestrationEngineService, h.engine)),
        Layer.provide(NodeServices.layer),
      ),
    ),
  );

describe("GroupResponderQueueReactor", () => {
  it.effect("asks for the next bot once the answering bot's session stops running", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, queueSet(1, THREAD, ["bot-specialist"]));
          yield* PubSub.publish(h.events, sessionSet(2, THREAD, "running"));
          yield* reactor.drainThrough(2);
          expect(h.dispatched).toEqual([]);

          yield* PubSub.publish(h.events, sessionSet(3, THREAD, "ready"));
          yield* reactor.drainThrough(3);

          expect(h.dispatched).toHaveLength(1);
          expect(h.dispatched[0]).toMatchObject({
            type: "thread.responder.advance",
            threadId: THREAD,
          });
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("does not start anyone before the first bot has run, or when nobody is waiting", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          // The first bot's session coming up ("ready" before it runs) is not a turn ending.
          yield* PubSub.publish(h.events, queueSet(1, THREAD, ["bot-specialist"]));
          yield* PubSub.publish(h.events, sessionSet(2, THREAD, "ready"));
          // A turn ending in a chat with an empty queue starts nobody.
          yield* PubSub.publish(h.events, sessionSet(3, OTHER_THREAD, "running"));
          yield* PubSub.publish(h.events, sessionSet(4, OTHER_THREAD, "ready"));
          yield* reactor.drainThrough(4);

          expect(h.dispatched).toEqual([]);
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("stops asking once the queue has been emptied by Stop or a new message", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, queueSet(1, THREAD, ["bot-specialist"]));
          yield* PubSub.publish(h.events, sessionSet(2, THREAD, "running"));
          yield* PubSub.publish(h.events, queueSet(3, THREAD, []));
          yield* PubSub.publish(h.events, sessionSet(4, THREAD, "ready"));
          yield* reactor.drainThrough(4);

          expect(h.dispatched).toEqual([]);
        }),
      );
    }).pipe(Effect.scoped),
  );
});
