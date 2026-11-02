import { it } from "@effect/vitest";
import {
  BotId,
  EventId,
  MessageId,
  ThreadId,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationEvent,
  type OrchestrationThread,
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
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import { makeGroupThread, makeReadModel } from "../test-support/GroupDeciderFixtures.ts";
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
      hopsLeft: 5,
      hopsUsed: 1,
      reason: "addressed" as const,
      updatedAt: NOW,
    },
  }) satisfies OrchestrationEvent;

const sessionSet = (sequence: number, threadId: ThreadId, status: "running" | "ready" | "error") =>
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

const reply = (
  sequence: number,
  threadId: ThreadId,
  text: string,
  options: {
    readonly streaming?: boolean;
    readonly turnId?: string;
    readonly messageId?: string;
  } = {},
) =>
  ({
    ...base(sequence, threadId),
    type: "thread.message-sent",
    payload: {
      threadId,
      messageId: MessageId.make(options.messageId ?? `reply-${sequence}`),
      role: "assistant" as const,
      text,
      turnId: TurnId.make(options.turnId ?? "turn-1"),
      respondingBotId: BotId.make("bot-specialist"),
      streaming: options.streaming ?? false,
      createdAt: NOW,
      updatedAt: NOW,
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

const queuedThread = (
  status: "running" | "ready" | null,
  entries: ReadonlyArray<string> = ["bot-specialist"],
): OrchestrationThread => ({
  ...makeGroupThread(),
  id: THREAD,
  responderQueue: {
    entries: entries.map((botId) => ({
      botId: BotId.make(botId),
      trigger: { kind: "user" as const, messageId: MessageId.make("message-1") },
    })),
    hopsLeft: 5,
    hopsUsed: 1,
    reason: "addressed" as const,
    updatedAt: NOW,
  },
  session:
    status === null
      ? null
      : {
          threadId: THREAD,
          status,
          providerName: "codex",
          runtimeMode: "full-access" as const,
          activeTurnId: null,
          lastError: null,
          updatedAt: NOW,
        },
});

const run = <A, E>(
  h: Effect.Success<typeof harness>,
  body: (reactor: GroupResponderQueueReactor["Service"]) => Effect.Effect<A, E>,
  persisted: ReadonlyArray<OrchestrationThread> = [],
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
        Layer.provide(
          Layer.mock(ProjectionSnapshotQuery)({
            getCommandReadModel: () => Effect.succeed(makeReadModel({ threads: persisted })),
          }),
        ),
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

  it.effect("asks again when a queued chat's session fails to start, but not for other chats", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          // The next bot's provider never gets going: starting -> error, with no running between.
          yield* PubSub.publish(h.events, queueSet(1, THREAD, ["bot-specialist"]));
          yield* PubSub.publish(h.events, sessionSet(2, THREAD, "error"));
          // A turn ending in a chat with an empty queue starts nobody.
          yield* PubSub.publish(h.events, sessionSet(3, OTHER_THREAD, "running"));
          yield* PubSub.publish(h.events, sessionSet(4, OTHER_THREAD, "ready"));
          yield* reactor.drainThrough(4);

          expect(h.dispatched).toHaveLength(1);
          expect(h.dispatched[0]).toMatchObject({
            type: "thread.responder.advance",
            threadId: THREAD,
          });
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
  it.effect("picks a queue back up after a restart left it waiting with no turn running", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(
        h,
        (reactor) =>
          Effect.gen(function* () {
            yield* reactor.drain;

            expect(h.dispatched).toHaveLength(1);
            expect(h.dispatched[0]).toMatchObject({
              type: "thread.responder.advance",
              threadId: THREAD,
            });
          }),
        [queuedThread("ready")],
      );
    }).pipe(Effect.scoped),
  );

  it.effect("waits for a persisted running turn to finish before advancing a restored queue", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(
        h,
        (reactor) =>
          Effect.gen(function* () {
            yield* reactor.drain;
            expect(h.dispatched).toEqual([]);

            yield* PubSub.publish(h.events, sessionSet(1, THREAD, "ready"));
            yield* reactor.drainThrough(1);

            expect(h.dispatched).toHaveLength(1);
          }),
        [queuedThread("running")],
      );
    }).pipe(Effect.scoped),
  );

  it.effect("leaves chats with an empty or absent queue alone after a restart", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(
        h,
        (reactor) =>
          Effect.gen(function* () {
            yield* reactor.drain;

            expect(h.dispatched).toEqual([]);
          }),
        [queuedThread("ready", []), { ...makeGroupThread(), id: OTHER_THREAD, session: null }],
      );
    }).pipe(Effect.scoped),
  );
  it.effect("hands the turn's final reply to the decider, then asks for the next bot", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, sessionSet(1, THREAD, "running"));
          // A streaming partial and an earlier commentary message do not count; the last final one does.
          yield* PubSub.publish(
            h.events,
            reply(2, THREAD, "Looking into @bot-boss", { turnId: "turn-1" }),
          );
          yield* PubSub.publish(
            h.events,
            reply(3, THREAD, "Over to @bot-boss", { streaming: true }),
          );
          yield* PubSub.publish(h.events, reply(4, THREAD, "Done. @bot-boss, your turn."));
          yield* PubSub.publish(h.events, sessionSet(5, THREAD, "ready"));
          yield* reactor.drainThrough(5);

          expect(h.dispatched.map((command) => command.type)).toEqual([
            "thread.responder.mention",
            "thread.responder.advance",
          ]);
          expect(h.dispatched[0]).toMatchObject({
            threadId: THREAD,
            turnId: "turn-1",
            botId: "bot-specialist",
            messageId: "reply-4",
          });
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("hands over a reply whose text arrived as deltas and finished with empty text", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, sessionSet(1, THREAD, "running"));
          // The runtime streams the text, then `assistant.complete` finishes the message with "".
          yield* PubSub.publish(
            h.events,
            reply(2, THREAD, "Over to ", { streaming: true, messageId: "msg-1" }),
          );
          yield* PubSub.publish(
            h.events,
            reply(3, THREAD, "@bot-boss, go", { streaming: true, messageId: "msg-1" }),
          );
          yield* PubSub.publish(h.events, reply(4, THREAD, "", { messageId: "msg-1" }));
          yield* PubSub.publish(h.events, sessionSet(5, THREAD, "ready"));
          yield* reactor.drainThrough(5);

          expect(h.dispatched.map((command) => command.type)).toEqual([
            "thread.responder.mention",
            "thread.responder.advance",
          ]);
          expect(h.dispatched[0]).toMatchObject({
            threadId: THREAD,
            turnId: "turn-1",
            botId: "bot-specialist",
            messageId: "msg-1",
          });
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("with a bot waiting, sends the mention before the one advance", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, queueSet(1, THREAD, ["bot-writer"]));
          yield* PubSub.publish(h.events, sessionSet(2, THREAD, "running"));
          yield* PubSub.publish(
            h.events,
            reply(3, THREAD, "@bot-boss, over", { streaming: true, messageId: "msg-1" }),
          );
          // Ingestion finalizes the reply before it sets the session ready.
          yield* PubSub.publish(h.events, reply(4, THREAD, "", { messageId: "msg-1" }));
          yield* PubSub.publish(h.events, sessionSet(5, THREAD, "ready"));
          yield* reactor.drainThrough(5);

          expect(h.dispatched.map((command) => command.type)).toEqual([
            "thread.responder.mention",
            "thread.responder.advance",
          ]);
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("hands a stopped turn's half-streamed reply to nobody", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, sessionSet(1, THREAD, "running"));
          yield* PubSub.publish(
            h.events,
            reply(2, THREAD, "Over to @bot-boss", { streaming: true, messageId: "msg-1" }),
          );
          yield* PubSub.publish(h.events, sessionSet(3, THREAD, "error"));
          // A later reply finishing under the same id must not be treated as a mention.
          yield* PubSub.publish(h.events, reply(4, THREAD, "", { messageId: "msg-1" }));
          yield* reactor.drainThrough(4);

          expect(h.dispatched).toEqual([]);
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("holds a reply finished mid-turn until the session ends", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, sessionSet(1, THREAD, "running"));
          yield* PubSub.publish(h.events, reply(2, THREAD, "Looking into @bot-boss"));
          yield* reactor.drainThrough(2);

          expect(h.dispatched).toEqual([]);

          yield* PubSub.publish(h.events, sessionSet(3, THREAD, "ready"));
          yield* reactor.drainThrough(3);

          expect(h.dispatched.map((command) => command.type)).toEqual([
            "thread.responder.mention",
            "thread.responder.advance",
          ]);
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("sends nothing when a delta-streamed reply never mentions anyone", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(
            h.events,
            reply(1, THREAD, "All done.", { streaming: true, messageId: "msg-1" }),
          );
          yield* PubSub.publish(h.events, reply(2, THREAD, "", { messageId: "msg-1" }));
          yield* PubSub.publish(h.events, sessionSet(3, THREAD, "ready"));
          yield* reactor.drainThrough(3);

          expect(h.dispatched).toEqual([]);
        }),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("sends nothing for a reply that mentions nobody, and forgets it after the turn", () =>
    Effect.gen(function* () {
      const h = yield* harness;

      yield* run(h, (reactor) =>
        Effect.gen(function* () {
          yield* PubSub.publish(h.events, reply(1, THREAD, "All done, nothing to hand over."));
          yield* PubSub.publish(h.events, sessionSet(2, THREAD, "ready"));
          // A mentioning reply from a turn that already ended must not be replayed by the next one.
          yield* PubSub.publish(h.events, reply(3, THREAD, "Ping @bot-boss"));
          yield* PubSub.publish(h.events, sessionSet(4, THREAD, "ready"));
          yield* PubSub.publish(h.events, sessionSet(5, THREAD, "ready"));
          yield* reactor.drainThrough(5);

          expect(h.dispatched.map((command) => command.type)).toEqual([
            "thread.responder.mention",
            "thread.responder.advance",
          ]);
        }),
      );
    }).pipe(Effect.scoped),
  );
});
