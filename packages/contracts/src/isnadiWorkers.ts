import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import { IsoDateTime, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

/** Workers run at depth 1 under a bot turn and cannot start workers of their own. */
export const ISNADI_WORKER_MAX_DEPTH = 1;

/** Running workers one bot turn may own at the same time. */
export const ISNADI_WORKER_MAX_CONCURRENCY = 3;

/** A worker that has not produced a result by this deadline fails with `timeout`. */
export const ISNADI_WORKER_TIMEOUT_MS = 10 * 60 * 1000;

export const ISNADI_WORKER_TASK_MAX_CHARS = 16_000;

export const IsnadiWorkerId = TrimmedNonEmptyString.pipe(Schema.brand("IsnadiWorkerId"));

export type IsnadiWorkerId = typeof IsnadiWorkerId.Type;

const WorkerText = TrimmedNonEmptyString.check(Schema.isMaxLength(ISNADI_WORKER_TASK_MAX_CHARS));

export const IsnadiWorkerTaskInput = Schema.Struct({
  task: WorkerText,
  expectedResult: Schema.optional(WorkerText),
  /** Return immediately with a Running status instead of waiting for the result. */
  background: Schema.optional(Schema.Boolean),
});

export const IsnadiWorkerCheckInput = Schema.Struct({
  workerId: IsnadiWorkerId,
  /** Wait until the worker reaches a terminal state. */
  wait: Schema.optional(Schema.Boolean),
});

export const IsnadiWorkerMessageInput = Schema.Struct({
  workerId: IsnadiWorkerId,
  message: WorkerText,
});

export const IsnadiWorkerStopInput = Schema.Struct({ workerId: IsnadiWorkerId });

export const IsnadiWorkerFailureCode = Schema.Literals(["timeout", "worker_failed", "internal"]);

export type IsnadiWorkerFailureCode = typeof IsnadiWorkerFailureCode.Type;

export const IsnadiWorkerPhase = Schema.TaggedUnion({
  Running: {
    childThreadId: Schema.NullOr(ThreadId),
    startedAt: IsoDateTime,
  },
  Completed: {
    childThreadId: ThreadId,
    startedAt: IsoDateTime,
    completedAt: IsoDateTime,
    result: TrimmedNonEmptyString,
  },
  Failed: {
    childThreadId: Schema.NullOr(ThreadId),
    startedAt: IsoDateTime,
    completedAt: IsoDateTime,
    failureCode: IsnadiWorkerFailureCode,
    message: TrimmedNonEmptyString,
  },
  Canceled: {
    childThreadId: Schema.NullOr(ThreadId),
    startedAt: IsoDateTime,
    completedAt: IsoDateTime,
    canceledBy: Schema.Literals(["stop", "parent-turn-ended"]),
  },
});

export type IsnadiWorkerPhase = typeof IsnadiWorkerPhase.Type;

/** Result of Task, CheckSubagent, MessageSubagent, and StopSubagent. */
export const IsnadiWorkerStatus = Schema.Struct({
  workerId: IsnadiWorkerId,
  task: TrimmedNonEmptyString,
  phase: IsnadiWorkerPhase,
});

export type IsnadiWorkerStatus = typeof IsnadiWorkerStatus.Type;

export const isIsnadiWorkerTerminal = (phase: IsnadiWorkerPhase): boolean =>
  !Predicate.isTagged(phase, "Running");
