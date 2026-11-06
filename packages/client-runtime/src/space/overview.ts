import type { RoutineLifecycle } from "@isnadi/contracts";

import type { Decision } from "../decisions.ts";

/** The parts of a group a space view reads. A web `Group` satisfies it. */
export interface SpaceGroup {
  readonly id: string;
  readonly bossBotId: string | null;
  readonly members: ReadonlyArray<{ readonly kind?: string; readonly botId?: string }>;
}

/** The parts of a routine the Overview reads. */
export interface SpaceRoutine {
  readonly botId: string;
  readonly enabled: boolean;
  readonly lifecycle: RoutineLifecycle;
  readonly nextRunAt: string | null;
}

export interface SpaceRoutineSummary {
  readonly active: number;
  readonly nextRunAt: string | null;
}

export const SPACE_ACTIVITY_LIMIT = 20;

/** The bots in a space: its group members and its boss, once each. */
export function spaceMembers(group: SpaceGroup): ReadonlySet<string> {
  const ids = new Set<string>();

  for (const member of group.members) {
    if (member.kind !== "person" && member.botId !== undefined) ids.add(member.botId);
  }

  if (group.bossBotId !== null) ids.add(group.bossBotId);

  return ids;
}

function inSpace(
  owner: {
    readonly botId?: string | null | undefined;
    readonly groupId?: string | null | undefined;
  },
  group: SpaceGroup,
  members: ReadonlySet<string>,
) {
  if (owner.groupId === group.id) return true;

  return owner.groupId == null && owner.botId != null && members.has(owner.botId);
}

/** Decisions waiting in the space's group chats or in a member's own chats. */
export function spaceDecisions(
  decisions: ReadonlyArray<Decision>,
  group: SpaceGroup,
): ReadonlyArray<Decision> {
  const members = spaceMembers(group);

  return decisions.filter((decision) => inSpace(decision, group, members));
}

/** Enabled routines owned by a member, with the soonest next run. */
export function spaceRoutines(
  routines: ReadonlyArray<SpaceRoutine>,
  group: SpaceGroup,
): SpaceRoutineSummary {
  const members = spaceMembers(group);
  let active = 0;
  let nextRunAt: string | null = null;

  for (const routine of routines) {
    if (!members.has(routine.botId) || !routine.enabled || routine.lifecycle === "deleted")
      continue;

    active += 1;

    if (routine.nextRunAt !== null && (nextRunAt === null || routine.nextRunAt < nextRunAt)) {
      nextRunAt = routine.nextRunAt;
    }
  }

  return { active, nextRunAt };
}

/**
 * The space's chats, waiting ones first, then newest first, capped. Shells carry no message
 * bodies, so a row is a chat title.
 */
export function spaceActivity<
  T extends SpaceOwned & {
    readonly id: string;
    readonly updatedAt: string;
    readonly archivedAt: string | null;
  },
>(
  shells: ReadonlyArray<T>,
  group: SpaceGroup,
  waitingThreadIds: ReadonlySet<string>,
  limit: number = SPACE_ACTIVITY_LIMIT,
): ReadonlyArray<T> {
  const members = spaceMembers(group);

  return shells
    .filter((shell) => shell.archivedAt === null && inSpace(shell, group, members))
    .toSorted((a, b) => {
      const waiting = Number(waitingThreadIds.has(b.id)) - Number(waitingThreadIds.has(a.id));

      return waiting !== 0 ? waiting : b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, limit);
}

function zoneParts(instant: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
  });

  const parts = formatter.formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")),
  };
}

function zoneOffsetMs(instant: number, timeZone: string) {
  const p = zoneParts(instant, timeZone);

  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(instant / 1000) * 1000
  );
}

/**
 * Monday 00:00 in `timeZone` for the week holding `now`, as an ISO instant. The wall-clock
 * Monday is converted back to an instant with the offset in force on that Monday, so a DST
 * change inside the week does not shift it by an hour.
 */
export function weekStart(now: Date, timeZone: string): string {
  const local = zoneParts(now.getTime(), timeZone);
  const wallMonday = Date.UTC(local.year, local.month - 1, local.day - local.weekday);
  const guess = wallMonday - zoneOffsetMs(wallMonday, timeZone);
  const instant = wallMonday - zoneOffsetMs(guess, timeZone);

  return new Date(instant).toISOString();
}
