import * as NodeOS from "node:os";

import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import { writeFileStringAtomically } from "./atomicWrite.ts";
import { ServerConfig } from "./config.ts";
import { isProcessAlive } from "./memory/BotMemoryFileStorage.ts";

export const SERVER_LOCK_FILE_NAME = "server.lock";

const ServerHomeLockRecord = Schema.Struct({
  pid: Schema.Int,
  hostname: Schema.String,
  startedAt: Schema.String,
  // Null from the moment the lock is taken until the HTTP server is listening.
  port: Schema.NullOr(Schema.Int),
});

type ServerHomeLockRecord = typeof ServerHomeLockRecord.Type;

const decodeRecord = Schema.decodeUnknownOption(Schema.fromJsonString(ServerHomeLockRecord));

/** Another live server already owns this state directory. */
export class ServerHomeLockHeldError extends Schema.TaggedErrorClass<ServerHomeLockHeldError>()(
  "ServerHomeLockHeldError",
  {
    lockPath: Schema.String,
    pid: Schema.Int,
    port: Schema.NullOr(Schema.Int),
    hostname: Schema.String,
  },
) {
  override get message(): string {
    const where = this.port === null ? "port not bound yet (starting)" : `port ${this.port}`;
    const host = this.hostname === NodeOS.hostname() ? "" : ` on host ${this.hostname}`;

    return `IsnadiBot is already running on this data directory (pid ${this.pid}${host}, ${where}). Lock: ${this.lockPath}`;
  }
}

/**
 * Held while this process owns the state directory's database. `bindPort` records the port once
 * the HTTP server is listening, so a second server can name it.
 */
export class ServerHomeLock extends Context.Service<
  ServerHomeLock,
  {
    readonly lockPath: string;
    readonly bindPort: (port: number) => Effect.Effect<void>;
  }
>()("isnadi/ServerHomeLock") {}

// Lock paths this process currently holds. After a crash in a container the replacement often has
// the same pid and hostname as the dead server, so "our pid" only means alive when we hold it.
const heldLockPaths = new Set<string>();

// An unexpected error from the probe means we cannot prove the holder is gone, so it counts as alive.
const probeProcess = (pid: number): boolean => {
  try {
    return isProcessAlive(pid);
  } catch {
    return true;
  }
};

// A holder on another host cannot be probed with a pid, so it always counts as alive.
const isHolderAlive = (holder: ServerHomeLockRecord, lockPath: string): boolean => {
  if (holder.hostname !== NodeOS.hostname()) return true;

  if (holder.pid === process.pid) return heldLockPaths.has(lockPath);

  return probeProcess(holder.pid);
};

const holderKey = (holder: Option.Option<ServerHomeLockRecord>): string =>
  Option.match(holder, {
    onNone: () => "none",
    onSome: (record) => `${record.pid}:${record.startedAt}`,
  });

const make = Effect.gen(function* () {
  const config = yield* ServerConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const lockPath = path.join(config.stateDir, SERVER_LOCK_FILE_NAME);
  const hostname = NodeOS.hostname();

  yield* fs.makeDirectory(config.stateDir, { recursive: true });

  const readHolder = fs.readFileString(lockPath).pipe(
    Effect.map((raw) => decodeRecord(raw)),
    Effect.catchIf(
      (cause) => Predicate.isTagged(cause.reason, "NotFound"),
      () => Effect.succeed(Option.none<ServerHomeLockRecord>()),
    ),
  );

  // The record is written to a private file first and hard-linked into place, so the lock never
  // exists half-written and linking fails when someone else holds it.
  const createExclusive = (record: ServerHomeLockRecord) =>
    Effect.scoped(
      Effect.gen(function* () {
        const stagedPath = `${lockPath}.${record.pid}.tmp`;

        yield* Effect.addFinalizer(() =>
          fs.remove(stagedPath, { force: true }).pipe(Effect.ignore),
        );
        yield* fs.writeFileString(stagedPath, `${JSON.stringify(record)}\n`);

        return yield* fs.link(stagedPath, lockPath).pipe(
          Effect.as(true),
          Effect.catchIf(
            (cause) => Predicate.isTagged(cause.reason, "AlreadyExists"),
            () => Effect.succeed(false),
          ),
        );
      }),
    );

  const acquire = Effect.gen(function* () {
    const now = yield* DateTime.now;

    const record: ServerHomeLockRecord = {
      pid: process.pid,
      hostname,
      startedAt: DateTime.formatIso(now),
      port: null,
    };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (yield* createExclusive(record)) return;

      const holder = yield* readHolder;

      if (Option.isSome(holder) && isHolderAlive(holder.value, lockPath)) {
        return yield* new ServerHomeLockHeldError({
          lockPath,
          pid: holder.value.pid,
          port: holder.value.port,
          hostname: holder.value.hostname,
        });
      }

      // Stale (the holder crashed), unreadable, or already gone. Re-read right before removing so
      // a lock that a faster starter just took is not deleted.
      const current = yield* readHolder;

      const unchanged = holderKey(holder) === holderKey(current);

      if (unchanged) {
        yield* Effect.logWarning("Taking over a stale server lock", {
          lockPath,
          previousPid: Option.isSome(holder) ? holder.value.pid : null,
        });
        yield* fs.remove(lockPath, { force: true });
      }
    }

    const holder = yield* readHolder;

    return yield* new ServerHomeLockHeldError({
      lockPath,
      pid: Option.isSome(holder) ? holder.value.pid : 0,
      port: Option.isSome(holder) ? holder.value.port : null,
      hostname: Option.isSome(holder) ? holder.value.hostname : hostname,
    });
  });

  const ownsLock = readHolder.pipe(
    Effect.map(
      (holder) =>
        Option.isSome(holder) &&
        holder.value.pid === process.pid &&
        holder.value.hostname === hostname,
    ),
  );

  // Only a lock this process still owns is deleted; a crashed predecessor's file stays for the
  // next start to take over.
  const release = Effect.gen(function* () {
    if (yield* ownsLock) yield* fs.remove(lockPath, { force: true });
  }).pipe(
    Effect.catchCause((cause) => Effect.logWarning("Failed to release the server lock", { cause })),
  );

  yield* Effect.acquireRelease(
    acquire.pipe(Effect.tap(() => Effect.sync(() => heldLockPaths.add(lockPath)))),
    () => Effect.sync(() => heldLockPaths.delete(lockPath)).pipe(Effect.andThen(release)),
  );

  const services = yield* Effect.context<FileSystem.FileSystem | Path.Path>();

  const bindPort = (port: number) =>
    Effect.gen(function* () {
      const holder = yield* readHolder;

      if (Option.isNone(holder) || holder.value.pid !== process.pid) return;

      yield* writeFileStringAtomically({
        filePath: lockPath,
        contents: `${JSON.stringify({ ...holder.value, port })}\n`,
      });
    }).pipe(
      Effect.provideContext(services),
      Effect.catchCause((cause) =>
        Effect.logWarning("Failed to record the server port", { cause }),
      ),
    );

  return ServerHomeLock.of({ lockPath, bindPort });
});

/**
 * Takes the state directory's lock, failing with {@link ServerHomeLockHeldError} when a live
 * server holds it. Provide this below anything that opens the database.
 */
export const layer = Layer.effect(ServerHomeLock, make);
