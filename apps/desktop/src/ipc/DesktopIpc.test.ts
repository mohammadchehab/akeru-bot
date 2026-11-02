import * as Predicate from "effect/Predicate";
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { vi } from "vite-plus/test";

import * as DesktopIpc from "./DesktopIpc.ts";

const invokeMethod: DesktopIpc.DesktopIpcMethod<never, never> = {
  channel: "desktop.test.invoke",
  handler: () => Effect.void,
};

const syncMethod: DesktopIpc.DesktopSyncIpcMethod<never, never> = {
  channel: "desktop.test.sync",
  handler: () => Effect.void,
};

function makeIpcMain(
  overrides: Partial<DesktopIpc.DesktopIpcMain> = {},
): DesktopIpc.DesktopIpcMain {
  return {
    removeHandler: vi.fn(),
    handle: vi.fn(),
    removeAllListeners: vi.fn(),
    on: vi.fn(),
    ...overrides,
  };
}

describe("DesktopIpc", () => {
  it.effect("preserves invoke registration context and cause", () =>
    Effect.gen(function* () {
      const cause = new Error("invoke registration failed");

      const ipcMain = makeIpcMain({
        handle: () => {
          throw cause;
        },
      });

      const ipc = DesktopIpc.make(ipcMain);

      const error = yield* Effect.flip(Effect.scoped(ipc.handle(invokeMethod)));

      assert.instanceOf(error, DesktopIpc.DesktopIpcRegistrationError);
      assert.isTrue(DesktopIpc.isDesktopIpcError(error));
      assert.strictEqual(error.handlerKind, "invoke");
      assert.strictEqual(error.channel, invokeMethod.channel);
      assert.strictEqual(error.cause, cause);
      assert.include(error.message, "invoke");
      assert.include(error.message, invokeMethod.channel);
      assert.notInclude(error.message, cause.message);
    }),
  );

  it.effect("preserves sync unregistration context and cause in the finalizer defect", () =>
    Effect.gen(function* () {
      const cause = new Error("sync unregistration failed");
      let removeCount = 0;

      const ipcMain = makeIpcMain({
        removeAllListeners: () => {
          removeCount += 1;

          if (removeCount === 2) throw cause;
        },
      });

      const ipc = DesktopIpc.make(ipcMain);

      const exit = yield* Effect.exit(Effect.scoped(ipc.handleSync(syncMethod)));

      assert.isTrue(Predicate.isTagged(exit, "Failure"));

      if (Predicate.isTagged(exit, "Success")) return;
      const error = Cause.squash(exit.cause);
      assert.instanceOf(error, DesktopIpc.DesktopIpcUnregistrationError);
      assert.isTrue(DesktopIpc.isDesktopIpcError(error));
      assert.strictEqual(error.handlerKind, "sync");
      assert.strictEqual(error.channel, syncMethod.channel);
      assert.strictEqual(error.cause, cause);
      assert.notInclude(error.message, cause.message);
    }),
  );

  describe("sender validation", () => {
    const topFrame = (url: string) => ({ url, parent: null });
    const subFrame = (url: string) => ({ url, parent: { url: "isnadi://app/", parent: null } });
    const sender = (type: string) => ({ getType: () => type });
    const mainEvent = { sender: sender("window"), senderFrame: topFrame("isnadi://app/") };

    const rejection = (promise: Promise<unknown>) =>
      Effect.promise(() =>
        promise.then(
          () => undefined,
          (cause: unknown) => cause,
        ),
      );

    const capture = Effect.gen(function* () {
      let invoke: DesktopIpc.DesktopIpcHandleListener | undefined;
      let sync: DesktopIpc.DesktopIpcSyncListener | undefined;

      const ipc = DesktopIpc.make(
        makeIpcMain({
          handle: (_channel, listener) => {
            invoke = listener;
          },
          on: (_channel, listener) => {
            sync = listener;
          },
        }),
      );

      yield* ipc.handle({
        channel: "desktop.test.secret",
        handler: () => Effect.succeed("secret"),
      });
      yield* ipc.handleSync({
        channel: "desktop.test.syncSecret",
        handler: () => Effect.succeed("secret"),
      });

      // SAFETY: the fake events carry only the fields the sender check reads.
      const call = (event: DesktopIpc.DesktopIpcSenderEvent) =>
        invoke!(event as Parameters<DesktopIpc.DesktopIpcHandleListener>[0]);

      const callSync = (event: DesktopIpc.DesktopIpcSenderEvent) => {
        const syncEvent: DesktopIpc.DesktopIpcSyncEvent = { ...event, returnValue: undefined };
        sync!(syncEvent);

        return syncEvent.returnValue;
      };

      return { call, callSync };
    });

    it.effect("serves the main window's top frame at the app origin", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const { call, callSync } = yield* capture;

          assert.strictEqual(yield* Effect.promise(() => call(mainEvent)), "secret");
          assert.strictEqual(callSync(mainEvent), "secret");
        }),
      ),
    );

    it.effect("rejects a preview webview, even one navigated to the app origin", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const { call, callSync } = yield* capture;

          for (const event of [
            { sender: sender("webview"), senderFrame: topFrame("https://evil.example/") },
            { sender: sender("webview"), senderFrame: topFrame("isnadi://app/") },
          ]) {
            const error = yield* rejection(call(event));
            assert.include(String(error), "Untrusted IPC sender");
            assert.isNull(callSync(event));
          }
        }),
      ),
    );

    it.effect("rejects subframes, foreign origins and events without a sender", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const { call, callSync } = yield* capture;

          for (const event of [
            { sender: sender("window"), senderFrame: subFrame("isnadi://app/") },
            { sender: sender("window"), senderFrame: topFrame("https://evil.example/") },
            { sender: sender("window"), senderFrame: topFrame("not a url") },
            { sender: sender("window"), senderFrame: null },
            {},
          ]) {
            assert.isDefined(yield* rejection(call(event)));
            assert.isNull(callSync(event));
          }
        }),
      ),
    );
  });
});
