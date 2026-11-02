import * as NodeChildProcess from "node:child_process";
import * as NodeOS from "node:os";

import { assert, describe, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { ServerConfig, layerTest } from "./config.ts";
import * as ServerHomeLock from "./serverHomeLock.ts";

const isHeldError = Schema.is(ServerHomeLock.ServerHomeLockHeldError);

// Each test gets its own state directory; the lock layer itself is built inside the test.
const TestLayer = layerTest(process.cwd(), { prefix: "isnadi-home-lock-test-" }).pipe(
  Layer.provideMerge(NodeServices.layer),
);

// A pid that belonged to a process that has since exited.
const deadPid = (): number => {
  const child = NodeChildProcess.spawnSync(process.execPath, ["-e", ""]);

  if (child.pid === undefined) throw new Error("Could not spawn a child to learn a dead pid.");

  return child.pid;
};

const lockRecord = (overrides: { pid: number; hostname?: string; port?: number | null }) =>
  `${JSON.stringify({
    pid: overrides.pid,
    hostname: overrides.hostname ?? NodeOS.hostname(),
    startedAt: "2026-11-02T00:00:00.000Z",
    port: overrides.port ?? null,
  })}\n`;

const lockPathOf = Effect.gen(function* () {
  const config = yield* ServerConfig;
  const path = yield* Path.Path;

  return path.join(config.stateDir, ServerHomeLock.SERVER_LOCK_FILE_NAME);
});

describe("serverHomeLock", () => {
  it.effect("takes the lock, records the port, and releases it on shutdown", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;

      yield* Effect.scoped(
        Effect.gen(function* () {
          const lock = yield* ServerHomeLock.ServerHomeLock;

          assert.strictEqual(lock.lockPath, lockPath);
          assert.strictEqual(JSON.parse(yield* fs.readFileString(lockPath)).port, null);

          yield* lock.bindPort(4_971);

          const record = JSON.parse(yield* fs.readFileString(lockPath));

          assert.strictEqual(record.pid, process.pid);
          assert.strictEqual(record.port, 4_971);
        }).pipe(Effect.provide(ServerHomeLock.layer)),
      );

      assert.isFalse(yield* fs.exists(lockPath));
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("refuses a second server and names the holder's pid and port", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;

      yield* fs.writeFileString(lockPath, lockRecord({ pid: process.pid, port: 4_971 }));

      const exit = yield* Effect.exit(Effect.scoped(Layer.build(ServerHomeLock.layer)));

      assert.isTrue(Exit.isFailure(exit));

      const message = Exit.isFailure(exit) ? String(exit.cause) : "";

      assert.include(message, `pid ${process.pid}`);
      assert.include(message, "port 4971");
      assert.include(message, lockPath);
      assert.isTrue(yield* fs.exists(lockPath));
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("says the port is not bound yet while the holder is still starting", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;

      yield* fs.writeFileString(lockPath, lockRecord({ pid: process.pid }));

      const error = yield* Effect.flip(Effect.scoped(Layer.build(ServerHomeLock.layer)));

      assert.isTrue(isHeldError(error));
      assert.include(error.message, "port not bound yet");
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("takes over the lock of a crashed server", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;

      yield* fs.writeFileString(lockPath, lockRecord({ pid: deadPid(), port: 4_971 }));

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* ServerHomeLock.ServerHomeLock;

          assert.strictEqual(JSON.parse(yield* fs.readFileString(lockPath)).pid, process.pid);
        }).pipe(Effect.provide(ServerHomeLock.layer)),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("takes over a lock file that cannot be read", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;

      yield* fs.writeFileString(lockPath, "not json");

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* ServerHomeLock.ServerHomeLock;

          assert.strictEqual(JSON.parse(yield* fs.readFileString(lockPath)).pid, process.pid);
        }).pipe(Effect.provide(ServerHomeLock.layer)),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("never takes over a lock from another host, even with a dead pid", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;

      yield* fs.writeFileString(
        lockPath,
        lockRecord({ pid: deadPid(), hostname: "another-machine.example", port: 4_971 }),
      );

      const error = yield* Effect.flip(Effect.scoped(Layer.build(ServerHomeLock.layer)));

      assert.isTrue(isHeldError(error));
      assert.include(error.message, "another-machine.example");
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("leaves a lock it no longer owns when it shuts down", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const lockPath = yield* lockPathOf;
      const other = lockRecord({ pid: deadPid(), port: 1_234 });

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* ServerHomeLock.ServerHomeLock;
          yield* fs.writeFileString(lockPath, other);
        }).pipe(Effect.provide(ServerHomeLock.layer)),
      );

      assert.strictEqual(yield* fs.readFileString(lockPath), other);
    }).pipe(Effect.provide(TestLayer)),
  );
});
