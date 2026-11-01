import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as Effect from "effect/Effect";

import { findProductHomeDir, resolveProductHomeDir } from "./productHome.ts";

const makeHome = Effect.acquireRelease(
  Effect.sync(() => NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "isnadi-home-"))),
  (home) => Effect.sync(() => NodeFS.rmSync(home, { recursive: true, force: true })),
);

const writeState = (dir: string) => {
  NodeFS.mkdirSync(NodePath.join(dir, "userdata"), { recursive: true });
  NodeFS.writeFileSync(NodePath.join(dir, "userdata", "state.sqlite"), "live data");
};

describe("resolveProductHomeDir", () => {
  it.effect("moves ~/.akeru to ~/.isnadi and leaves a link at the old path", () =>
    Effect.gen(function* () {
      const home = yield* makeHome;
      writeState(NodePath.join(home, ".akeru"));

      const resolved = yield* resolveProductHomeDir(home);

      assert.equal(resolved, NodePath.join(home, ".isnadi"));
      assert.equal(
        NodeFS.readFileSync(NodePath.join(home, ".isnadi", "userdata", "state.sqlite"), "utf8"),
        "live data",
      );
      assert.isTrue(NodeFS.lstatSync(NodePath.join(home, ".akeru")).isSymbolicLink());
      assert.equal(
        NodeFS.readFileSync(NodePath.join(home, ".akeru", "userdata", "state.sqlite"), "utf8"),
        "live data",
      );
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("keeps an existing ~/.isnadi and leaves ~/.akeru alone", () =>
    Effect.gen(function* () {
      const home = yield* makeHome;
      writeState(NodePath.join(home, ".isnadi"));
      writeState(NodePath.join(home, ".akeru"));

      assert.equal(yield* resolveProductHomeDir(home), NodePath.join(home, ".isnadi"));
      assert.isFalse(NodeFS.lstatSync(NodePath.join(home, ".akeru")).isSymbolicLink());
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("is idempotent once the data has moved", () =>
    Effect.gen(function* () {
      const home = yield* makeHome;
      writeState(NodePath.join(home, ".akeru"));

      yield* resolveProductHomeDir(home);

      assert.equal(yield* resolveProductHomeDir(home), NodePath.join(home, ".isnadi"));
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("uses ~/.isnadi for a fresh install", () =>
    Effect.gen(function* () {
      const home = yield* makeHome;

      assert.equal(yield* resolveProductHomeDir(home), NodePath.join(home, ".isnadi"));
      assert.isFalse(NodeFS.existsSync(NodePath.join(home, ".akeru")));
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});

describe("findProductHomeDir", () => {
  const find = (existing: ReadonlyArray<string>) =>
    findProductHomeDir({
      homeDirectory: "/home/alice",
      joinPath: NodePath.posix.join,
      exists: (path) => existing.includes(path),
    });

  it("finds an unmigrated ~/.akeru without moving it", () => {
    assert.equal(find(["/home/alice/.akeru"]), "/home/alice/.akeru");
  });

  it("prefers ~/.isnadi once it exists", () => {
    assert.equal(find(["/home/alice/.isnadi", "/home/alice/.akeru"]), "/home/alice/.isnadi");
  });

  it("defaults to ~/.isnadi", () => {
    assert.equal(find([]), "/home/alice/.isnadi");
  });
});
