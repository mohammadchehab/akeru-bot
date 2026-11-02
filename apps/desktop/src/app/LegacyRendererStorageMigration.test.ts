import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as NodeVM from "node:vm";
import { beforeEach, vi } from "vite-plus/test";

class FakeLocalStorage {
  readonly #items = new Map<string, string>();

  constructor(entries: ReadonlyArray<readonly [string, string]> = []) {
    for (const [key, value] of entries) this.#items.set(key, value);
  }

  get length(): number {
    return this.#items.size;
  }

  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }

  entries(): Array<[string, string]> {
    return [...this.#items.entries()];
  }
}

type ScriptResult = ReturnType<typeof NodeVM.runInNewContext>;

interface WindowRecord {
  url: string | null;
  destroyed: boolean;
}

function runInStorage(script: string, storage: FakeLocalStorage): ScriptResult {
  return NodeVM.runInNewContext(script, { localStorage: storage });
}

const { storages, handleMock, unhandleMock, flushStorageDataMock, windows } = vi.hoisted(() => ({
  storages: new Map<string, FakeLocalStorage>(),
  handleMock: vi.fn(),
  unhandleMock: vi.fn(),
  flushStorageDataMock: vi.fn(),
  windows: [] as Array<WindowRecord>,
}));

vi.mock("electron", () => {
  class BrowserWindow {
    readonly record: WindowRecord = { url: null, destroyed: false };
    readonly webContents = {
      executeJavaScript: (script: string) => {
        const origin = new URL(this.record.url ?? "about:blank").protocol;
        const storage = storages.get(origin) ?? new FakeLocalStorage();
        storages.set(origin, storage);

        return Promise.resolve(runInStorage(script, storage));
      },
    };

    constructor() {
      windows.push(this.record);
    }

    loadURL(url: string): Promise<void> {
      this.record.url = url;

      return Promise.resolve();
    }

    isDestroyed(): boolean {
      return this.record.destroyed;
    }

    destroy(): void {
      this.record.destroyed = true;
    }
  }

  return {
    BrowserWindow,
    protocol: { handle: handleMock, unhandle: unhandleMock },
    session: { defaultSession: { flushStorageData: flushStorageDataMock } },
  };
});

import * as Migration from "./LegacyRendererStorageMigration.ts";

describe("LegacyRendererStorageMigration", () => {
  beforeEach(() => {
    storages.clear();
    windows.length = 0;
    handleMock.mockReset();
    unhandleMock.mockReset();
    flushStorageDataMock.mockReset();
  });

  it("selects only entries whose keys are missing at the new origin", () => {
    assert.deepEqual(
      Migration.selectMissingEntries(
        [
          ["akeru:theme", "dark"],
          ["akeru:drafts", "{}"],
          ["shared", "legacy"],
        ],
        ["shared", "isnadi:theme"],
      ),
      [
        ["akeru:theme", "dark"],
        ["akeru:drafts", "{}"],
      ],
    );
  });

  it("reads every localStorage entry and key", () => {
    const storage = new FakeLocalStorage([
      ["a", "1"],
      ["b", ""],
    ]);

    assert.deepEqual(runInStorage(Migration.READ_LOCAL_STORAGE_ENTRIES_SCRIPT, storage), [
      ["a", "1"],
      ["b", ""],
    ]);
    assert.deepEqual(runInStorage(Migration.READ_LOCAL_STORAGE_KEYS_SCRIPT, storage), ["a", "b"]);
  });

  it("writes entries without overwriting existing keys, escaping values safely", () => {
    const storage = new FakeLocalStorage([["kept", "current"]]);

    const tricky = `"}); throw new Error("x"); ({" </script>`;

    const written = runInStorage(
      Migration.makeWriteLocalStorageEntriesScript([
        ["kept", "legacy"],
        ["new", tricky],
      ]),
      storage,
    );

    assert.equal(written, 1);
    assert.deepEqual(storage.entries(), [
      ["kept", "current"],
      ["new", tricky],
    ]);
  });

  it("serves an empty HTML page on the app host only", async () => {
    const page = Migration.makeMigrationPageResponse(
      new Request(Migration.getMigrationPageUrl("akeru")),
    );

    assert.equal(page.status, 200);
    assert.include(page.headers.get("content-type") ?? "", "text/html");
    assert.include(await page.text(), "<!doctype html>");

    const other = Migration.makeMigrationPageResponse(new Request("akeru://other/"));
    assert.equal(other.status, 404);
  });

  it.effect("migrates legacy entries once and writes a marker", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const userData = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "isnadi-local-storage-migration-",
      });

      yield* fileSystem.makeDirectory(path.join(userData, Migration.CHROMIUM_LOCAL_STORAGE_DIR));

      storages.set(
        "akeru:",
        new FakeLocalStorage([
          ["akeru:theme", "dark"],
          ["shared", "legacy"],
        ]),
      );
      storages.set("isnadi:", new FakeLocalStorage([["shared", "current"]]));

      yield* Migration.migrateLegacyLocalStorage({ userDataPath: userData, isDevelopment: false });

      assert.deepEqual(storages.get("isnadi:")?.entries(), [
        ["shared", "current"],
        ["akeru:theme", "dark"],
      ]);
      assert.deepEqual(
        handleMock.mock.calls.map((call) => call[0]),
        ["akeru", "isnadi"],
      );
      assert.deepEqual(unhandleMock.mock.calls.map((call) => call[0]).toSorted(), [
        "akeru",
        "isnadi",
      ]);
      assert.deepEqual(
        windows.map((window) => [window.url, window.destroyed]),
        [
          ["akeru://app/legacy-storage-migration", true],
          ["isnadi://app/legacy-storage-migration", true],
        ],
      );
      assert.equal(flushStorageDataMock.mock.calls.length, 1);

      const markerPath = path.join(userData, Migration.LEGACY_LOCAL_STORAGE_MIGRATION_MARKER_FILE);
      const marker = JSON.parse(yield* fileSystem.readFileString(markerPath));
      assert.equal(marker.legacyEntries, 2);
      assert.equal(marker.written, 1);

      // Second run is a no-op because of the marker.
      yield* Migration.migrateLegacyLocalStorage({ userDataPath: userData, isDevelopment: false });
      assert.equal(windows.length, 2);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("uses the development schemes in development", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const userData = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "isnadi-local-storage-migration-",
      });

      yield* fileSystem.makeDirectory(path.join(userData, Migration.CHROMIUM_LOCAL_STORAGE_DIR));
      storages.set("akeru-dev:", new FakeLocalStorage([["k", "v"]]));

      yield* Migration.migrateLegacyLocalStorage({ userDataPath: userData, isDevelopment: true });

      assert.deepEqual(storages.get("isnadi-dev:")?.entries(), [["k", "v"]]);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("skips windows and writes the marker when there is no Local Storage dir", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const userData = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "isnadi-local-storage-migration-",
      });

      yield* Migration.migrateLegacyLocalStorage({ userDataPath: userData, isDevelopment: false });

      assert.equal(windows.length, 0);
      assert.equal(handleMock.mock.calls.length, 0);
      assert.isTrue(
        yield* fileSystem.exists(
          path.join(userData, Migration.LEGACY_LOCAL_STORAGE_MIGRATION_MARKER_FILE),
        ),
      );
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("never fails startup and retries next launch when Electron throws", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const userData = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "isnadi-local-storage-migration-",
      });

      yield* fileSystem.makeDirectory(path.join(userData, Migration.CHROMIUM_LOCAL_STORAGE_DIR));
      handleMock.mockImplementationOnce(() => {
        throw new Error("scheme already handled");
      });

      yield* Migration.migrateLegacyLocalStorage({ userDataPath: userData, isDevelopment: false });

      assert.isFalse(
        yield* fileSystem.exists(
          path.join(userData, Migration.LEGACY_LOCAL_STORAGE_MIGRATION_MARKER_FILE),
        ),
      );
      assert.equal(windows.length, 0);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});
