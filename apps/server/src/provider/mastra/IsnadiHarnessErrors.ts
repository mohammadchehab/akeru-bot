import * as Schema from "effect/Schema";

export const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

/** Harness construction failed before it could serve any session. */
export class IsnadiMastraHarnessError extends Schema.TaggedErrorClass<IsnadiMastraHarnessError>()(
  "IsnadiMastraHarnessError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Isnadi harness ${this.operation} failed: ${errorMessage(this.cause)}`;
  }
}

/** Observational memory work was requested after the harness scope began closing. */
export class IsnadiObservationQueueClosedError extends Schema.TaggedErrorClass<IsnadiObservationQueueClosedError>()(
  "IsnadiObservationQueueClosedError",
  {
    threadId: Schema.String,
    resourceId: Schema.String,
  },
) {
  override get message(): string {
    return "Isnadi observational memory is closing.";
  }
}

/**
 * Restoring an observation snapshot failed. `cause` is always the original
 * restore failure; `rollbackCause` is set only when putting the prior records
 * back failed too, in which case `rolledBack` is false.
 */
export class IsnadiObservationRestoreError extends Schema.TaggedErrorClass<IsnadiObservationRestoreError>()(
  "IsnadiObservationRestoreError",
  {
    threadId: Schema.String,
    resourceId: Schema.String,
    rolledBack: Schema.Boolean,
    cause: Schema.Defect(),
    rollbackCause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return this.rolledBack
      ? `Observation restore failed and the original observations were kept: ${errorMessage(this.cause)}`
      : `Observation restore failed and the original observations could not be restored: ${errorMessage(this.cause)}`;
  }
}

export const isObservationQueueClosed = Schema.is(IsnadiObservationQueueClosedError);
