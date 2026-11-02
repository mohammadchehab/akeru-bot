/**
 * Sign-in and sign-out for the Cursor CLI on the environment host. One login runs at a time: a new
 * one ends the previous. Isnadi stores no Cursor credential; the CLI keeps its own login state, so
 * the provider snapshot is refreshed whenever a login or logout finishes.
 *
 * @module provider/Layers/cursor/CursorLoginControl
 */
import { CursorLoginError, type ProviderInstanceId } from "@isnadi/contracts";
import { resolveSpawnCommand } from "@isnadi/shared/shell";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Scope from "effect/Scope";
import * as Semaphore from "effect/Semaphore";
import { ChildProcess } from "effect/unstable/process";

import { ServerSettingsService } from "../../../serverSettings.ts";
import { spawnAndCollect } from "../../providerSnapshot.ts";
import { ProviderRegistry } from "../../Services/ProviderRegistry.ts";
import { startCursorLogin } from "./CursorLoginRunner.ts";
import { resolveCursorLoginTarget } from "./CursorLoginTarget.ts";

/** How long the CLI gets to print its link before the client is told to sign in on the host. */
const DEFAULT_LINK_WAIT = "20 seconds";

/** A login nobody finishes in the browser is ended after this. */
const LOGIN_LIFETIME = "10 minutes";

export interface CursorLoginControlDeps {
  /** The binary and environment the instance runs with, or why it cannot sign in. */
  readonly resolve: (
    instanceId: ProviderInstanceId,
  ) => Effect.Effect<{ readonly binaryPath: string; readonly env: NodeJS.ProcessEnv }, string>;
  /** How long the CLI gets to print its link. */
  readonly linkWait?: Duration.Input | undefined;
  /** Brings the provider snapshot up to date once the CLI's login state may have changed. */
  readonly refresh: (instanceId: ProviderInstanceId) => Effect.Effect<void>;
  /** Outlives any request: a login keeps running after the RPC that started it has answered. */
  readonly scope: Scope.Scope;
}

const failure = (operation: "login" | "logout", reason: string) =>
  new CursorLoginError({ operation, reason: reason.trim() || "the Cursor CLI reported no reason" });

interface RunningLogin {
  readonly stop: Effect.Effect<void>;
}

export const makeCursorLoginControl = Effect.fn("makeCursorLoginControl")(function* (
  deps: CursorLoginControlDeps,
) {
  const current = yield* Ref.make<Option.Option<RunningLogin>>(Option.none());
  // One login at a time, however the requests interleave.
  const lock = yield* Semaphore.make(1);
  const linkWait = deps.linkWait ?? DEFAULT_LINK_WAIT;

  const stopCurrent = Ref.getAndSet(current, Option.none()).pipe(
    Effect.flatMap(Option.match({ onNone: () => Effect.void, onSome: (running) => running.stop })),
  );

  /** Forgets a login, but only if it is still the current one: a newer login must stay stoppable. */
  const forget = (running: RunningLogin) =>
    Ref.update(current, (held) =>
      Option.isSome(held) && held.value === running ? Option.none() : held,
    );

  const resolve = (operation: "login" | "logout", instanceId: ProviderInstanceId) =>
    deps.resolve(instanceId).pipe(
      Effect.mapError((reason) => failure(operation, reason)),
      Effect.flatMap((target) =>
        resolveSpawnCommand(target.binaryPath, [operation], { env: target.env }).pipe(
          Effect.mapError((cause) => failure(operation, String(cause))),
          Effect.map((spawnCommand) => ({ ...target, spawnCommand })),
        ),
      ),
    );

  const cancel = lock.withPermits(1)(stopCurrent);

  const start = Effect.fn("CursorLoginControl.start")(function* (instanceId: ProviderInstanceId) {
    return yield* lock.withPermits(1)(
      Effect.gen(function* () {
        yield* stopCurrent;

        const target = yield* resolve("login", instanceId);
        const loginScope = yield* Scope.fork(deps.scope, "sequential");

        const login = yield* startCursorLogin({
          command: target.spawnCommand.command,
          args: target.spawnCommand.args,
          env: target.env,
          shell: target.spawnCommand.shell,
        }).pipe(
          Effect.provideService(Scope.Scope, loginScope),
          Effect.tapError(() => Scope.close(loginScope, Exit.void)),
          Effect.mapError((cause) => failure("login", String(cause))),
        );

        const running: RunningLogin = {
          stop: login.cancel.pipe(Effect.andThen(Scope.close(loginScope, Exit.void))),
        };

        yield* Ref.set(current, Option.some(running));

        // The CLI exits once the browser step is done, or when it is cancelled or times out.
        yield* login.exit.pipe(
          Effect.timeoutOption(LOGIN_LIFETIME),
          Effect.flatMap(Option.match({ onNone: () => login.cancel, onSome: () => Effect.void })),
          Effect.andThen(Scope.close(loginScope, Exit.void)),
          Effect.andThen(forget(running)),
          Effect.andThen(deps.refresh(instanceId)),
          Effect.forkIn(deps.scope),
        );

        const link = yield* login.loginUrl.pipe(Effect.timeoutOption(linkWait));
        const loginUrl = Option.getOrNull(Option.flatMap(link, Option.fromNullishOr));

        // No link: the client is told to sign in on the host, so this login has no purpose left.
        if (loginUrl === null) {
          yield* running.stop;
          yield* forget(running);
        }

        return { loginUrl };
      }),
    );
  });

  /** Signs out. The caller refreshes the provider, so the snapshot it returns is the fresh one. */
  const logout = Effect.fn("CursorLoginControl.logout")(function* (instanceId: ProviderInstanceId) {
    return yield* lock.withPermits(1)(
      Effect.gen(function* () {
        yield* stopCurrent;

        const target = yield* resolve("logout", instanceId);

        const result = yield* spawnAndCollect(
          target.binaryPath,
          ChildProcess.make(target.spawnCommand.command, target.spawnCommand.args, {
            env: target.env,
            shell: target.spawnCommand.shell,
          }),
        ).pipe(Effect.mapError((cause) => failure("logout", String(cause))));

        if (result.code !== 0) {
          return yield* failure("logout", result.stderr || result.stdout);
        }
      }),
    );
  });

  return { start, logout, cancel };
});

/** The server's single Cursor sign-in controller. */
export class CursorLogin extends Context.Service<
  CursorLogin,
  Effect.Success<ReturnType<typeof makeCursorLoginControl>>
>()("isnadibot/provider/CursorLogin") {}

/** Resolves the instance from settings and refreshes the provider registry after a login. */
export const layer = Layer.effect(
  CursorLogin,
  Effect.gen(function* () {
    const serverSettings = yield* ServerSettingsService;
    const registry = yield* ProviderRegistry;

    return yield* makeCursorLoginControl({
      resolve: (instanceId) =>
        serverSettings.getSettings.pipe(
          Effect.mapError(() => "Could not read the server settings."),
          Effect.flatMap((settings) =>
            Effect.fromResult(resolveCursorLoginTarget(settings, instanceId)),
          ),
        ),
      refresh: (instanceId) => registry.refreshInstance(instanceId).pipe(Effect.asVoid),
      scope: yield* Effect.scope,
    });
  }),
);
