# Model fallback and rate limits

> For maintainers. Design for the per-bot fallback chain (S0804) and rate-limit aware routing (S0805).
> Using IsnadiBot? See [docs/user](../user/).

A bot keeps the model the user chose. It can also keep an ordered list of other models, on any provider
instance, that answer when its model can't. A model that keeps failing is paused for a while so turns stop
hitting it. Today a 429 or a usage limit fails the turn, and the user has to switch models by hand.

## Goal

- A turn that hits a rate limit, a usage limit, or an overloaded model runs again on the next model in
  the bot's list without the user doing anything. The chat says which model it moved to.
- A failing model pauses: 10 minutes after the first failure, doubling on each consecutive failure up to
  2 hours. A success clears it. A usage limit with a reset time pauses until that time.
- Endpoints with declared request limits (per minute, per day) are skipped before they would answer 429.
- When every model in the list is paused, the turn fails with one error that says when the first one
  comes back.

Out of scope: PII masking (S0806, S0808, S0809), the full "model a turn ran on" UI (S0807), and resuming a
turn after a usage limit resets (S0803). This design leaves a seam for each.

## What exists today

- `BotEngine` (`packages/contracts/src/orchestration/roster.ts`) is `{ provider, model, options? }`, where
  `provider` is a provider instance id. Nothing on a bot names a second model.
- `Context.ts` in `orchestration/Layers/provider-command/` reads `bot.engine` and calls
  `AgentController.resolveEngine`. `EngineRouting.ts` validates the instance, model, and credentials, and
  switches a live Mastra session in place with `session.model.switch`.
- Mastra's `StreamErrorRetryProcessor` (`provider/mastra/IsnadiErrorProcessors.ts`) retries a failed
  model call twice on the same model, 3 seconds apart. After that the controller's `error` handler
  (`agentController/Events.ts`) turns `event.error` into a string, publishes `runtime.error`, and finishes
  the turn as failed. The `Error` object, with its status code and headers, is dropped there.
- `subscription-auth/accountLimits.ts` matches limit messages (`isAccountLimitMessage`) and parses
  "try again in 2h" (`limitRetryAt`, 60 minutes when nothing parses). It benches subscription accounts
  through `nextRetryAt` in the health store. Custom API instances never get a `nextRetryAt`:
  `recordHealthFailure` clears it.
- `model.rerouted` is a runtime event with `{ fromModel, toModel, reason }`. `ActivityMapping.ts`
  projects it to an info activity, but nothing emits it.
- No turn-level attempt, retry, or per-model pause exists anywhere.

## Decisions

### The chain lives on the bot

`BotEngine` gains `fallbacks`, an ordered list of `BotEngineChoice` entries. `BotEngineChoice` is today's
`{ provider, model, options? }`, so an entry is validated exactly like the primary. The list decodes to `[]`
when absent, so stored bots, exports, and older clients keep working. At most 4 entries. An entry may not
repeat the primary or another entry.

Rejected:

- **A global or per-provider chain.** A recruiting bot may be limited to paid subscriptions while a scratch
  bot runs on free endpoints. D21 leaves that choice to the user, per bot.
- **Letting the provider pick.** No provider moves a turn to another vendor.

### The router sits in AgentController

The decider still writes the bot's primary engine into `modelSelection`. Which model a turn actually runs
on is a runtime fact (pauses, limits, credentials), so it lives beside `resolveEngine` at the adapter
boundary. Chat, groups, channels, delegations, and routines all start turns through AgentController, so
one router covers every path. D21 holds: a free endpoint in a bot's list answers wherever that bot does.

Two calls, one module (`agentController/ModelRouter.ts`):

- **Pick at turn start.** `resolveEngine` walks `[primary, ...fallbacks]` and returns the first entry that
  passes `inspectEngine` and is not paused or at a declared limit. If the pick is not the primary, the
  controller emits `model.rerouted` before the turn starts, so the chat says why.
- **Move on failure.** In the `error` handler, before `finishTurn`, the router classifies the error and
  decides whether this attempt may move (below). If so it records the pause, emits `model.rerouted`,
  switches the session to the next ready entry, and sends the same user message again under the same
  `turnId`. Otherwise the turn fails as today.

Rejected: a decider-level retry with a new `thread.turn.retry` command. It would put provider health into
the event log and make replay depend on wall-clock pauses.

### Switching a live session

Every entry the chain may move to runs on the Mastra path, so the switch is the same
`state.set({ providerInstanceId, modelOptions })` plus `session.model.switch` that `resolveEngine` already
does. Mastra memory is keyed by thread, so the next model sees the same history.

`ActiveSession.provider` and `ActiveSession.providerInstanceId` are `readonly` today (`State.ts`), so after
a live switch to another instance, events and health would still name the old one. Make both mutable and
update them in the switch. `startSession` already compares them to decide on reuse, so keeping them
current is also what stops it from rebuilding a session for nothing.

### Which failures move a turn

Classification moves to one pure function, `classifyModelFailure`, in
`provider/modelFailure.ts`. It takes `{ message, statusCode?, retryAfter?, errorType? }`. The `error`
handler fills the optional fields from `event.error` when it is an AI SDK `APICallError`, before the
error becomes a string. `accountLimits.ts` keeps its exports and delegates to the shared pattern.

| Class         | Signals                                                             | Moves the turn | Pause                                |
| ------------- | ------------------------------------------------------------------- | -------------- | ------------------------------------ |
| `rate-limit`  | 429, "too many requests", "rate limit", declared window full        | yes            | `Retry-After`, else backoff          |
| `usage-limit` | quota and plan messages that `LIMIT_PATTERN` matches                | yes            | parsed reset time, else backoff      |
| `overloaded`  | 500, 502, 503, 504, 529, connection reset or timeout                | yes            | backoff                              |
| `unavailable` | 401, 403, unknown model                                             | yes            | until the instance's settings change |
| `request`     | other 4xx, context too long, content refused, anything unclassified | no             | none                                 |

Backoff is 10 minutes × 2^(failures − 1), capped at 2 hours. A parsed reset time or `Retry-After` wins
when present, capped at 24 hours. A successful turn on the model clears its record.

`request` and unknown failures stay as they are today. Another model would most likely fail the same way,
and moving would hide a real problem.

### When a turn may move

An attempt may move only when no tool started and no assistant text streamed. 429s and quota errors come
back before the first token, so this covers the common case. A failure after a tool ran (a file written, a
message sent) still fails the turn, because running it again could repeat the side effect. The model is
paused anyway, so the bot's next turn starts on the next entry.

To know this, `ActiveTurn` (`State.ts`) gains `toolCallsStarted`, which is incremented in the `tool_start`
handler. "No text" is the existing `assistantText` being empty. `ActiveTurn` also keeps the user message
it was started with (today only `PendingTurn.message` has it), so the router can resend it.

Each entry is tried at most once per turn. When none is left, the turn fails with the `models_exhausted`
error class and a message naming the time the earliest pause ends.

### Accounts stay below models

Backup subscription accounts already rotate inside one instance: `accountLimits.ts` benches an account
on a usage limit, and the next credential read picks the next ready account. The chain is the level
above. A model on a subscription instance counts as paused only when every linked account is benched, and
its pause ends at the earliest account's `nextRetryAt`. When another account is still ready, the router
retries the same entry once before it moves to the next one. Slice 2 confirms that `getModelConnection`
re-reads the credential for each request; if it does not, the router skips the retry and moves on.

### Pauses live in the health store

Model pauses go in the existing provider health store (`subscription-auth/healthService.ts`, saved next to
`subscription-auth.json`). That store already writes atomically, re-reads on change, and holds a
`provider:<instanceId>` record for every instance, Custom API included. It gains a `models` record keyed by
`<instanceId>/<model>`, holding `failures`, `pausedUntil`, `reason` (the failure class), and the day's
request count when the instance declares a daily limit.

Rejected:

- **An orchestration event per pause.** Pauses expire on a clock, are shared by every thread in the
  environment, and say nothing about any one chat.
- **A new file.** It would mean a second store with its own locking and re-read logic.

### Declared request limits

`CustomOpenaiSettings` gains optional `requestsPerMinute` and `requestsPerDay`. They are blank by
default, and presets for known free endpoints fill them in. The Custom API model is built with
`createOpenAICompatible` (`mastra/IsnadiModels.ts`), which takes a `fetch`. A small wrapping `fetch`
counts requests per instance and model:

- At turn start, the router skips an entry whose window is full.
- If the minute window fills mid-turn (a tool loop), the request waits until a slot frees, at most
  60 seconds, instead of failing a turn that has already run tools.
- If the day window fills, the request fails as `rate-limit`, which follows the rules above.

The same `fetch` passes the response status and `Retry-After` to the classifier, which helps when an
error processor wraps the `APICallError`. A real 429 still pauses the model, so an endpoint whose real
limits are lower than declared stops being hit.

Subscription drivers get no declared limits. Their plans don't publish per-minute numbers, and their limit
messages already carry a reset time.

### PII hook

Masking (S0806) belongs to the model request, not to the router. The resent message goes through the same
send path as the first attempt, so whatever masking wraps the request covers every attempt. One seam is
reserved now: `ModelRouter` asks `FallbackPolicy.allows(threadId, entry)` before it picks or moves to an
entry. It allows everything until S0806 replaces it. That is where "never move this chat from a local
model to a hosted free endpoint" will go.

## Per-provider decisions

| Driver              | In the chain | Classification source                              | Notes                                                                                                                                                                                                                                                                                |
| ------------------- | ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Codex               | yes          | `APICallError` status, message                     | Account rotation as above.                                                                                                                                                                                                                                                           |
| Claude              | yes          | same                                               | Account rotation as above.                                                                                                                                                                                                                                                           |
| Grok                | yes          | same                                               |                                                                                                                                                                                                                                                                                      |
| Kimi For Coding     | yes          | same                                               |                                                                                                                                                                                                                                                                                      |
| OpenCode Go         | yes          | same                                               | Mastra path, so it switches in session like the rest.                                                                                                                                                                                                                                |
| Custom API          | yes          | status and `Retry-After` from the wrapping `fetch` | Declared request limits apply. Pauses work here for the first time.                                                                                                                                                                                                                  |
| OpenCode (standard) | no           | —                                                  | The legacy bridge owns its session and retries on its own (`session.status` retry). Moving a turn means rebuilding the session across the bridge. The settings UI hides the list when the primary is a standard OpenCode instance. Validation rejects standard OpenCode as an entry. |

The rule is enforced in `inspectEngine`: an entry whose instance reports anything other than
`sessionModelSwitch: "in-session"` is invalid as a fallback.

### History consent and save-time checks (slice 3)

A fallback entry can move the chat's history to another vendor, so the contract carries
`BotEngineChoice.historyConsent`. Adding an entry on another instance asks the user once and records `historyConsent: true`; the server
refuses a Custom API entry, or one on an instance the registry does not report, on another instance without
it. An entry left without consent (after import) shows an "Allow chat sharing" action that grants it. Saves also refuse a
standard OpenCode entry. Both rules live in `provider/engineFallbackPolicy.ts`, called from the
WebSocket `dispatchCommand` handler and the HTTP dispatch, which already require operate scope. No bot tool edits its own engine.
Portability import keeps only entries whose provider exists in the target environment and clears
`historyConsent` on them, so consent never travels with a file. The `FallbackPolicy` seam that decides
when a turn may move arrives with slice 4 (TASK-63.2).

## Contracts

All changes are additive, and older clients decode them.

- `orchestration/roster.ts`: `BotEngineChoice` (today's struct) and
  `BotEngine = BotEngineChoice + fallbacks`, defaulting to `[]`. `BotCreateCommand`, `BotUpdateCommand`,
  `ClientBotUpdateCommand`, and the bot event payloads pick it up through `BotEngine`. `portability.ts`
  exports and imports the list.
- `providerRuntime/sessionEvents.ts`: `ModelReroutedPayload` gains optional `fromInstanceId`,
  `toInstanceId`, and `failureClass`. `reason` stays a readable sentence.
- `providerRuntime/base.ts`: `RuntimeErrorClass` gains `models_exhausted`. A turn that cannot start fails with
  the `provider.turn.start.failed` activity, which carries `class: "models_exhausted"` and `resumesAt`
  (ISO time) in its payload.
- `server/providers.ts`: `ServerProviderModel` gains optional
  `pause: { until, reason, requestsLeftToday? }`. Clients already receive this snapshot, so bot settings
  shows each entry's state without a new subscription.
- `settings/providers.ts`: `CustomOpenaiSettings` gains optional `requestsPerMinute` and `requestsPerDay`.
- New RPC `providers.resumeModel({ instanceId, model })`, which clears one pause.

## Clients

Every surface that edits a bot's engine must keep `fallbacks` intact:

- **Web bot settings.** `BotEngineFields` gets the "If <model> can't answer" list from Figma E8e
  (2161:1215): add, remove, reorder, a status per row, and **Resume now** on a paused row.
- **Model pickers.** `useBotProfileDraft`, `botEngineSelection.ts`, `NewBotDialog`, onboarding
  (`desktopOnboardingEngine.ts`), and the command palette's "Change model" change the primary only. They
  must carry the existing list through, not drop it.
- **Mobile.** `threadBotEngineUpdate` (`apps/mobile/src/state/thread-bot-engine.ts`) carries the list
  through the same way. Editing the list on mobile is a follow-up; mobile shows a read-only count in
  `ThreadSettingsSheet`.
- **Chat.** `model.rerouted` renders as the E8c line: "<from> hit its usage limit, so this turn moved to
  <to>." The `models_exhausted` failure renders "Every model in <bot>'s list is out of usage. <bot>
  resumes at <time>" with **Change models**, which opens bot settings. S0807 later restyles both.
- **Copy.** All strings go through the interface catalogs, Arabic included. See
  [interface translations](interface-translations.md).

## Reverse states

- **See it.** Each row in bot settings shows ready, paused until a time, or at its daily limit. The chat
  line names the move. Provider settings shows paused models under their instance.
- **Undo it.** **Resume now** clears one pause. Saving an instance's URL, key, or sign-in clears every
  pause on that instance, because the failure may be fixed. A successful turn clears that model's record.
- **Leave it.** Removing an entry, or emptying the list, returns the bot to today's behavior. A pause on a
  removed entry expires on its own and affects nothing.

## What must not change

- The decider stays pure. No provider health enters events, except the `model.rerouted` activity.
- `modelSelection` on the turn-start command is still the bot's primary. Thread history records the
  primary as requested, and the reroute activity records what ran.
- A turn that ran a tool is never sent again.
- Account rotation and its `nextRetryAt` semantics are unchanged.

## Testing

Wait on receipts and drains, never on sleeps. Pauses use the injected `Clock`, so backoff tests move
`TestClock`.

- `modelFailure.test.ts`: status codes, `Retry-After`, every `LIMIT_PATTERN` phrase, and unknown errors
  falling through to `request`.
- Router unit tests: pick order, skip paused, skip at limit, skip disallowed by `FallbackPolicy`, the
  doubling and its cap, clear on success.
- AgentController integration with a fake Mastra stream:
  - A 429 before the first token moves the turn once and emits `model.rerouted`.
  - A 429 after `tool_start` fails the turn.
  - A full list fails with `models_exhausted`.
  - Moving to another instance updates `ActiveSession.providerInstanceId`.
- Contract decode tests: a bot without `fallbacks`, and a provider snapshot without `pause`.
- Web: a `BotEngineFields` browser test for the list. Each picker keeps `fallbacks` on save.

## Slices

Each slice is one PR and leaves main shippable.

1. **Classifier.** Add `provider/modelFailure.ts` and make `accountLimits.ts` delegate to it. Have the
   `error` handler capture status and `Retry-After` from `event.error`. No behavior change. Server only.
2. **Pause store.** Add `models` health records, backoff, clear on success, and clear on instance settings
   save. Expose `ServerProviderModel.pause` and add `providers.resumeModel`. Pauses are recorded but
   nothing reads them yet. Confirm the per-request credential re-read (see "Accounts stay below models").
3. **Contract and editing.** Add `BotEngineChoice`, `fallbacks`, and the validation rules. Every picker on
   web and mobile carries the list through. Add the web bot settings list with statuses and
   **Resume now**. The list is saved but not yet used.
4. **Pick at turn start.** `resolveEngine` walks the list, skips paused entries, emits `model.rerouted`,
   and fails with `models_exhausted`. Make `ActiveSession` instance fields mutable. Add the chat lines.
   This is the first slice users notice.
5. **Move on failure.** Add `toolCallsStarted`, keep the message on `ActiveTurn`, move in the `error`
   handler, and add the `FallbackPolicy` seam.
6. **Declared limits.** Add the Custom API `requestsPerMinute`/`requestsPerDay` settings, the counting
   `fetch`, presets, and the daily count in the health store.

Slices 1 and 3 can run in parallel. Slices 2 and 4 depend on 1, slice 5 on 4, and slice 6 on 2.
User-facing docs (`docs/user/`) ship with slices 4 and 6.

## Open questions

None for the user. D21 settles where free endpoints may answer.
