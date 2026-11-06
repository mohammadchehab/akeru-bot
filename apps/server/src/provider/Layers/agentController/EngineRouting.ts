import { invalidReasoningSelection, type IsnadiModelOptions } from "../../ReasoningOptions.ts";
import { resolveClaudeApiModelId } from "../ClaudeProvider.ts";
import {
  type ModelSelection,
  type ProviderRuntimeEvent,
  ProviderDriverKind,
  ProviderInstanceId,
} from "@isnadi/contracts";

import * as Effect from "effect/Effect";

import * as Semaphore from "effect/Semaphore";

import { SubscriptionAuthService } from "../../../subscription-auth/service.ts";
import { mastraModelId } from "../../IsnadiMastraHarness.ts";

import {
  AgentControllerModelsExhaustedError,
  AgentControllerRuntimeError,
  AgentControllerUnsupportedEngineError,
  ProviderValidationError,
} from "../../Errors.ts";
import { type AgentControllerShape } from "../../Services/AgentController.ts";
import { LegacyProviderBridge } from "../../Services/LegacyProviderBridge.ts";

import { fallbackAllowedAtTurn } from "../../engineFallbackPolicy.ts";
import { eventId, nowIso } from "./EventIdentity.ts";
import { earliestUntil, pickEntry, type SkippedEntry } from "./ModelRouter.ts";
import { type ResolvedEngine, type ActiveSession } from "./State.ts";
import { subscriptionProviderForDriver, mastraConnectionIssue } from "./ProviderAccess.ts";

export function createEngineRouting(deps: {
  readonly legacyProviderBridge: LegacyProviderBridge["Service"];
  readonly usesMastraCode: (provider: ProviderDriverKind) => boolean;
  readonly disabledProviderError: (
    operation: string,
    providerInstanceId: ProviderInstanceId,
  ) => ProviderValidationError;
  readonly modelConnections: Map<
    string,
    {
      readonly environment: NodeJS.ProcessEnv;
      readonly instanceEnvironment: NodeJS.ProcessEnv;
      readonly useSavedCredential: boolean;
    }
  >;
  readonly subscriptionAuth: SubscriptionAuthService;
  readonly mutationLock: Semaphore.Semaphore;
  readonly resolvedByThread: Map<string, ResolvedEngine>;
  readonly sessions: Map<string, ActiveSession>;
  readonly mastraModelOptions: (resolved: ResolvedEngine) => IsnadiModelOptions | undefined;
  readonly publish: (event: ProviderRuntimeEvent) => void;
  readonly modelPausedUntil: (selection: ModelSelection) => Effect.Effect<number | undefined>;
  readonly runMastra: <A>(
    operation: string,
    run: (signal: AbortSignal) => Promise<A>,
  ) => Effect.Effect<A, AgentControllerRuntimeError, never>;
}) {
  const inspectEngine: AgentControllerShape["inspectEngine"] = Effect.fn(
    "AgentController.inspectEngine",
  )(function* (modelSelection) {
    const provider = String(modelSelection.instanceId);
    const model = modelSelection.model;

    const unavailable = (cause: unknown) =>
      new AgentControllerUnsupportedEngineError({
        provider,
        model,
        detail: `Provider instance '${provider}' is not set up.`,
        cause,
      });

    const routing = yield* deps.legacyProviderBridge
      .getInstanceInfo(modelSelection.instanceId)
      .pipe(Effect.mapError(unavailable));

    if (deps.usesMastraCode(routing.driverKind) && !routing.enabled) {
      return yield* deps.disabledProviderError(
        "AgentController.inspectEngine",
        modelSelection.instanceId,
      );
    }

    // Fail closed on a model the instance's snapshot does not advertise.
    // The bot engine is applied after ws-level preflight ran against the
    // command's own selection, so this check is the only validation a
    // bot-owned thread ever sees. An empty snapshot is not evidence the
    // model is unknown — the first probe may still be running.
    // Only a settled probe is authoritative: pending snapshots still carry
    // the built-in catalog, and probe fallbacks do too, so neither proves the
    // saved model is gone.
    if (
      deps.usesMastraCode(routing.driverKind) &&
      routing.instanceSnapshot !== undefined &&
      routing.instanceSnapshot.status === "ready"
    ) {
      const advertised = routing.instanceSnapshot.models;

      const advertisedModel = advertised.find((entry) => entry.slug === model);

      const invalidOption = invalidReasoningSelection(
        modelSelection,
        advertisedModel?.capabilities,
      );

      if (invalidOption) {
        return yield* new ProviderValidationError({
          operation: "AgentController.inspectEngine",
          issue: invalidOption,
        });
      }

      if (advertised.length > 0 && !advertisedModel) {
        const name = routing.instanceSnapshot.displayName ?? routing.driverKind;

        return yield* new AgentControllerUnsupportedEngineError({
          provider,
          model,
          detail: `Model '${model}' is not available for ${name}.`,
          unavailability: "unsupported-model",
        });
      }
    }

    if (routing.mastraConnection) {
      deps.modelConnections.set(String(modelSelection.instanceId), routing.mastraConnection);
    } else {
      deps.modelConnections.delete(String(modelSelection.instanceId));
    }

    if (deps.usesMastraCode(routing.driverKind)) {
      const subscriptionProvider = subscriptionProviderForDriver(routing.driverKind);

      const issue = mastraConnectionIssue(
        routing.driverKind,
        routing.mastraConnection,
        subscriptionProvider
          ? deps.subscriptionAuth.isConnected(subscriptionProvider, modelSelection.instanceId)
          : false,
      );

      if (issue) {
        return yield* new AgentControllerUnsupportedEngineError({
          provider,
          model,
          detail: issue,
          // Signing in only fixes an instance that uses a saved account. A
          // custom-credential instance, or a driver with no account such as
          // Custom API, keeps its own message.
          ...(subscriptionProvider && routing.mastraConnection?.useSavedCredential
            ? { unavailability: "missing-login" as const }
            : {}),
        });
      }
    }

    const capabilities = deps.usesMastraCode(routing.driverKind)
      ? { sessionModelSwitch: "in-session" as const }
      : yield* deps.legacyProviderBridge
          .getCapabilities(modelSelection.instanceId)
          .pipe(Effect.mapError(unavailable));

    return { modelSelection, routing, capabilities };
  });

  /** When the instance's subscription accounts all come back, or undefined while one can still serve. */
  const benchedUntil = (instanceId: string) =>
    deps.legacyProviderBridge.getInstanceInfo(ProviderInstanceId.make(instanceId)).pipe(
      Effect.map((routing) => {
        const provider = subscriptionProviderForDriver(routing.driverKind);

        return provider ? deps.subscriptionAuth.benchedUntil(provider, instanceId) : undefined;
      }),
      Effect.orElseSucceed(() => undefined),
    );

  /**
   * Nothing in the chain can run. With no time to wait for, the primary's own
   * error is the honest answer (a single-model bot behaves as it always did).
   * Otherwise the turn waits on the soonest model to come back.
   */
  const exhausted = (skipped: ReadonlyArray<SkippedEntry>) => {
    const resumesAt = earliestUntil(skipped);
    const primaryError = skipped[0]?.error;

    if (resumesAt === undefined && primaryError !== undefined) {
      return Effect.fail(primaryError);
    }

    return Effect.fail(
      new AgentControllerModelsExhaustedError({
        detail: "every model in this bot's list is paused or unavailable.",
        ...(resumesAt !== undefined ? { resumesAt } : {}),
      }),
    );
  };

  const rerouteReason = (first: SkippedEntry | undefined) =>
    first?.reason === "paused" || first?.reason === "benched"
      ? "The first model is paused."
      : "The first model is unavailable.";

  const resolveEngine: AgentControllerShape["resolveEngine"] = (input) =>
    deps.mutationLock.withPermits(1)(
      Effect.gen(function* () {
        const primary: ModelSelection =
          input.engine === null
            ? input.fallback
            : {
                instanceId: ProviderInstanceId.make(input.engine.provider),
                model: input.engine.model,
                ...(input.engine.options ? { options: input.engine.options } : {}),
              };

        const chain = [
          primary,
          ...(input.engine?.fallbacks ?? []).map(
            (entry): ModelSelection => ({
              instanceId: ProviderInstanceId.make(entry.provider),
              model: entry.model,
              ...(entry.options ? { options: entry.options } : {}),
            }),
          ),
        ];

        const providers = input.providers ?? [];
        const started = deps.sessions.has(String(input.threadId));

        const cannotSwitch = (instanceId: string) =>
          providers.find((provider) => provider.instanceId === instanceId)
            ?.requiresNewThreadForModelChange === true;

        const { pick, skipped } = yield* pickEntry({
          chain,
          allowed: (selection, index) => {
            const historyConsent = input.engine?.fallbacks[index - 1]?.historyConsent;

            return fallbackAllowedAtTurn({
              providers,
              from: String(primary.instanceId),
              entry:
                historyConsent === undefined
                  ? { provider: String(selection.instanceId) }
                  : { provider: String(selection.instanceId), historyConsent },
            });
          },
          requiresNewThread: (selection) =>
            started &&
            (cannotSwitch(String(selection.instanceId)) ||
              cannotSwitch(String(primary.instanceId))),
          pausedUntil: deps.modelPausedUntil,
          benchedUntil: benchedUntil,
          inspect: inspectEngine,
        });

        if (pick === undefined) {
          return yield* exhausted(skipped);
        }

        const modelSelection = pick.selection;
        const inspected = pick.inspected;
        const previous = deps.resolvedByThread.get(String(input.threadId));

        const resolved: ResolvedEngine = {
          modelSelection,
          provider: inspected.routing.driverKind,
          providerInstanceId: modelSelection.instanceId,
          mastraModelId: mastraModelId(
            inspected.routing.driverKind,
            inspected.routing.driverKind === "claudeAgent"
              ? resolveClaudeApiModelId(modelSelection)
              : modelSelection.model,
          ),
          botConversation: input.botConversation,
          ...(previous?.botName ? { botName: previous.botName } : {}),
          ...(previous?.personalityTone !== undefined
            ? { personalityTone: previous.personalityTone }
            : {}),
        };

        deps.resolvedByThread.set(String(input.threadId), resolved);
        const active = deps.sessions.get(String(input.threadId));

        if (active && deps.usesMastraCode(resolved.provider)) {
          const { modelOptions: _priorModelOptions, ...activeState } = active.session.state.get();
          const nextModelOptions = deps.mastraModelOptions(resolved);
          yield* deps.runMastra("state.set", () =>
            active.session.state.set({
              ...activeState,
              providerInstanceId: String(resolved.providerInstanceId),
              modelOptions: nextModelOptions ?? {},
            }),
          );
          yield* deps.runMastra("model.switch", () =>
            active.session.model.switch({ modelId: resolved.mastraModelId }),
          );
          active.model = modelSelection.model;
          active.provider = resolved.provider;
          active.providerInstanceId = resolved.providerInstanceId;
        }

        if (pick.index > 0) {
          const first = skipped[0];
          deps.publish({
            eventId: eventId(),
            provider: resolved.provider,
            providerInstanceId: resolved.providerInstanceId,
            threadId: input.threadId,
            createdAt: nowIso(),
            type: "model.rerouted",
            payload: {
              fromModel: primary.model,
              toModel: modelSelection.model,
              reason: rerouteReason(first),
              fromInstanceId: String(primary.instanceId),
              toInstanceId: String(modelSelection.instanceId),
              failureClass: first?.reason ?? "unavailable",
            },
          });
        }

        return { ...inspected, mode: "default" };
      }),
    );

  return { inspectEngine, resolveEngine };
}
