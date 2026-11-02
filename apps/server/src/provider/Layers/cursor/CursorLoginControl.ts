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
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Scope from "effect/Scope";
import { ChildProcess } from "effect/unstable/process";

import { ServerSettingsService } from "../../../serverSettings.ts";
import { spawnAndCollect } from "../../providerSnapshot.ts";
import { ProviderRegistry } from "../../Services/ProviderRegistry.ts";
import { startCursorLogin } from "./CursorLoginRunner.ts";

/** How long the CLI gets to print its link before the client is told to sign in on the host. */
const LINK_WAIT = "20 seconds";

/** A login nobody finishes in the browser is ended after this. */
const LOGIN_LIFETIME = "10 minutes";

export interface CursorLoginControlDeps {
  readonly binaryPath: Effect.Effect<string>;
  readonly env: NodeJS.ProcessEnv;
  /** Brings the provider snapshot up to date once the CLI's login state may have changed. */
  readonly refresh: (instanceId: ProviderInstanceId) => Effect.Effect<void>;
  /** Outlives any request: a login keeps running after the RPC that started it has answered. */
  readonly scope: Scope.Scope;
}

const failure = (operation: "login" | "logout", reason: string) =>
  new CursorLoginError({ operation, reason: reason.trim() || "the Cursor CLI reported no reason" });

export const makeCursorLoginControl = Effect.fn("makeCursorLoginControl")(function* (
  deps: CursorLoginControlDeps,
) {
  const current = yield* Ref.make<Option.Option<Effect.Effect<void>>>(Option.none());

  const cancel = Ref.getAndSet(current, Option.none()).pipe(
    Effect.flatMap(Option.match({ onNone: () => Effect.void, onSome: (stop) => stop })),
  );

  const start = Effect.fn("CursorLoginControl.start")(function* (instanceId: ProviderInstanceId) {
    yield* cancel;

    const command = yield* deps.binaryPath;
    const spawnCommand = yield* resolveSpawnCommand(command, ["login"], { env: deps.env });
    const loginScope = yield* Scope.fork(deps.scope, "sequential");

    const login = yield* startCursorLogin({
      command: spawnCommand.command,
      args: spawnCommand.args,
      env: deps.env,
      shell: spawnCommand.shell,
    }).pipe(
      Effect.provideService(Scope.Scope, loginScope),
      Effect.tapError(() => Scope.close(loginScope, Exit.void)),
      Effect.mapError((cause) => failure("login", String(cause))),
    );

    const stop = login.cancel.pipe(Effect.andThen(Scope.close(loginScope, Exit.void)));

    yield* Ref.set(current, Option.some(stop));

    // The CLI exits once the browser step is done, or when it is cancelled or times out.
    yield* login.exit.pipe(
      Effect.timeoutOption(LOGIN_LIFETIME),
      Effect.flatMap(Option.match({ onNone: () => login.cancel, onSome: () => Effect.void })),
      Effect.andThen(Scope.close(loginScope, Exit.void)),
      Effect.andThen(deps.refresh(instanceId)),
      Effect.forkIn(deps.scope),
    );

    const link = yield* login.loginUrl.pipe(Effect.timeoutOption(LINK_WAIT));

    return { loginUrl: Option.getOrNull(Option.flatMap(link, Option.fromNullishOr)) };
  });

  const logout = Effect.fn("CursorLoginControl.logout")(function* (instanceId: ProviderInstanceId) {
    yield* cancel;

    const command = yield* deps.binaryPath;

    const result = yield* resolveSpawnCommand(command, ["logout"], { env: deps.env }).pipe(
      Effect.flatMap((spawnCommand) =>
        spawnAndCollect(
          command,
          ChildProcess.make(spawnCommand.command, spawnCommand.args, {
            env: deps.env,
            shell: spawnCommand.shell,
          }),
        ),
      ),
      Effect.mapError((cause) => failure("logout", String(cause))),
      Effect.ensuring(deps.refresh(instanceId)),
    );

    if (result.code !== 0) {
      return yield* failure("logout", result.stderr || result.stdout);
    }
  });

  return { start, logout, cancel };
});

/** The server's single Cursor sign-in controller. */
export class CursorLogin extends Context.Service<
  CursorLogin,
  Effect.Success<ReturnType<typeof makeCursorLoginControl>>
>()("isnadibot/provider/CursorLogin") {}

/** Reads the CLI path from settings and refreshes the provider registry after a login or logout. */
export const layer = Layer.effect(
  CursorLogin,
  Effect.gen(function* () {
    const serverSettings = yield* ServerSettingsService;
    const registry = yield* ProviderRegistry;

    return yield* makeCursorLoginControl({
      binaryPath: serverSettings.getSettings.pipe(
        Effect.map((settings) => settings.providers.cursor.binaryPath || "agent"),
        Effect.orElseSucceed(() => "agent"),
      ),
      env: process.env,
      refresh: (instanceId) => registry.refreshInstance(instanceId).pipe(Effect.asVoid),
      scope: yield* Effect.scope,
    });
  }),
);
