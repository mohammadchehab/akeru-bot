import * as Schema from "effect/Schema";

import {
  BotId,
  CommandId,
  GroupId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ThreadId,
  TrimmedNonEmptyString,
} from "../baseSchemas.ts";

export const WorkItemId = TrimmedNonEmptyString.pipe(Schema.brand("WorkItemId"));

export type WorkItemId = typeof WorkItemId.Type;

export const WorkItemState = Schema.Literals([
  "queued",
  "assigned",
  "in-progress",
  "blocked",
  "review",
  "done",
  "closed",
]);

export type WorkItemState = typeof WorkItemState.Type;

/** States a member may move its own item to. */
export const WorkItemProgressState = Schema.Literals(["in-progress", "review"]);

export type WorkItemProgressState = typeof WorkItemProgressState.Type;

export const WorkItemKind = Schema.Literals(["task", "bug"]);

export type WorkItemKind = typeof WorkItemKind.Type;

export const WorkItemResolution = Schema.Literals(["done", "dropped"]);

export type WorkItemResolution = typeof WorkItemResolution.Type;

/** At most this many items per group may be queued, assigned, in progress, blocked or in review. */
export const WORK_ITEM_OPEN_LIMIT = 200;

export const WORK_ITEM_PAGE_LIMIT = 50;

const WorkItemTitle = TrimmedNonEmptyString.check(Schema.isMaxLength(200));

const WorkItemBrief = Schema.String.check(Schema.isMaxLength(8000));

/** The badge text is user-visible, for example "Needs sign-in". */
export const WorkItemBlockedOn = Schema.Struct({
  by: Schema.Literals(["user", "bot"]),
  botId: Schema.optional(BotId),
  note: TrimmedNonEmptyString.check(Schema.isMaxLength(200)),
});

export type WorkItemBlockedOn = typeof WorkItemBlockedOn.Type;

export const TrackerLink = Schema.Struct({
  kind: Schema.Literals(["github", "jira", "url"]),
  ref: TrimmedNonEmptyString,
});

export type TrackerLink = typeof TrackerLink.Type;

const GITHUB_ITEM_URL = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(?:issues|pull)\/(\d+)\/?$/;

const JIRA_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

/** Turns pasted text into a tracker link, or null when it is not a link Isnadi accepts. */
export function parseTrackerLink(text: string): TrackerLink | null {
  const value = text.trim();

  if (JIRA_KEY.test(value)) return { kind: "jira", ref: value };

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;

  return { kind: GITHUB_ITEM_URL.test(value) ? "github" : "url", ref: value };
}

export const WorkItem = Schema.Struct({
  id: WorkItemId,
  groupId: GroupId,
  title: WorkItemTitle,
  brief: WorkItemBrief,
  kind: WorkItemKind,
  role: Schema.optional(TrimmedNonEmptyString),
  ownerBotId: Schema.optional(BotId),
  assignedByBotId: Schema.optional(BotId),
  state: WorkItemState,
  blockedOn: Schema.optional(WorkItemBlockedOn),
  /** The state to return to on unblock. Set only while the item is blocked. */
  blockedFrom: Schema.optional(WorkItemState),
  trackerLink: Schema.optional(TrackerLink),
  threadId: Schema.optional(ThreadId),
  prUrl: Schema.optional(TrimmedNonEmptyString),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  doneAt: Schema.optional(IsoDateTime),
  closedAt: Schema.optional(IsoDateTime),
});

export type WorkItem = typeof WorkItem.Type;

const ActorBotId = Schema.optional(BotId);

/**
 * `actorBotId` is set when a bot issues the command; user commands omit it and
 * are authorized by the dispatching actor instead.
 */
export const WorkItemCreateCommand = Schema.Struct({
  type: Schema.Literal("work-item.create"),
  commandId: CommandId,
  workItemId: WorkItemId,
  groupId: GroupId,
  title: WorkItemTitle,
  brief: WorkItemBrief,
  kind: WorkItemKind,
  role: Schema.optional(TrimmedNonEmptyString),
  trackerLink: Schema.optional(TrackerLink),
  actorBotId: ActorBotId,
});

export const WorkItemAssignCommand = Schema.Struct({
  type: Schema.Literal("work-item.assign"),
  commandId: CommandId,
  workItemId: WorkItemId,
  ownerBotId: Schema.NullOr(BotId),
  actorBotId: ActorBotId,
});

export const WorkItemUpdateCommand = Schema.Struct({
  type: Schema.Literal("work-item.update"),
  commandId: CommandId,
  workItemId: WorkItemId,
  title: Schema.optional(WorkItemTitle),
  brief: Schema.optional(WorkItemBrief),
  state: Schema.optional(WorkItemProgressState),
  threadId: Schema.optional(ThreadId),
  prUrl: Schema.optional(TrimmedNonEmptyString),
  actorBotId: ActorBotId,
});

export const WorkItemBlockCommand = Schema.Struct({
  type: Schema.Literal("work-item.block"),
  commandId: CommandId,
  workItemId: WorkItemId,
  blockedOn: WorkItemBlockedOn,
  actorBotId: ActorBotId,
});

export const WorkItemUnblockCommand = Schema.Struct({
  type: Schema.Literal("work-item.unblock"),
  commandId: CommandId,
  workItemId: WorkItemId,
  actorBotId: ActorBotId,
});

export const WorkItemCloseCommand = Schema.Struct({
  type: Schema.Literal("work-item.close"),
  commandId: CommandId,
  workItemId: WorkItemId,
  resolution: WorkItemResolution,
  actorBotId: ActorBotId,
});

export const WorkItemReopenCommand = Schema.Struct({
  type: Schema.Literal("work-item.reopen"),
  commandId: CommandId,
  workItemId: WorkItemId,
  actorBotId: ActorBotId,
});

export const ClientWorkItemCommand = Schema.Union([
  WorkItemCreateCommand,
  WorkItemAssignCommand,
  WorkItemUpdateCommand,
  WorkItemBlockCommand,
  WorkItemUnblockCommand,
  WorkItemCloseCommand,
  WorkItemReopenCommand,
]);

export type ClientWorkItemCommand = typeof ClientWorkItemCommand.Type;

/** Every work-item event but `deleted` carries the whole item as it is after the change. */
export const WorkItemChangedPayload = Schema.Struct({ workItem: WorkItem });

export type WorkItemChangedPayload = typeof WorkItemChangedPayload.Type;

export const WorkItemDeletedPayload = Schema.Struct({
  workItemId: WorkItemId,
  groupId: GroupId,
  deletedAt: IsoDateTime,
});

export type WorkItemDeletedPayload = typeof WorkItemDeletedPayload.Type;

export const WorkItemListInput = Schema.Struct({
  groupId: GroupId,
  state: Schema.Literals(["done", "closed"]),
  cursor: Schema.optional(TrimmedNonEmptyString),
  limit: Schema.optional(PositiveInt.check(Schema.isLessThanOrEqualTo(WORK_ITEM_PAGE_LIMIT))),
});

export type WorkItemListInput = typeof WorkItemListInput.Type;

export const WorkItemListResult = Schema.Struct({
  items: Schema.Array(WorkItem),
  nextCursor: Schema.optional(TrimmedNonEmptyString),
});

export type WorkItemListResult = typeof WorkItemListResult.Type;

export const WorkItemCountsInput = Schema.Struct({ groupId: GroupId, since: IsoDateTime });

export type WorkItemCountsInput = typeof WorkItemCountsInput.Type;

export const WorkItemCountsResult = Schema.Struct({
  open: NonNegativeInt,
  inProgress: NonNegativeInt,
  doneSince: NonNegativeInt,
});

export type WorkItemCountsResult = typeof WorkItemCountsResult.Type;

export class WorkItemReadError extends Schema.TaggedErrorClass<WorkItemReadError>()(
  "WorkItemReadError",
  { groupId: GroupId, message: TrimmedNonEmptyString },
) {}
