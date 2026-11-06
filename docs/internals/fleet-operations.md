# Fleet operations

> For maintainers. Design for E13, fleet operations built in (decision D20: all 12 behaviours).
> Using IsnadiBot? See [docs/user](../user/).

A fleet is a group of bots with a boss, hired from a template. Today such a team works only while someone
drives it: a bot that finishes waits until a person gives it the next thing, a long chat fills its context, and
nobody sees who is blocked. Fleet operations make the server keep the team running. Bots hand off and clear
their own context, a dispatcher keeps them busy from a shared queue, and the team reports in one place.

The behaviours come from the `/fleet` skills, which do this today with tmux and scripts. Here they are native:
events, a reactor and receipts, with no terminal and no polling.

## Goal

- A bot that finishes a turn picks up the next queued item for its role without anyone asking. Plain code
  assigns it; the boss is woken only when a choice needs judgement.
- When the whole team is idle and the queue is empty, the boss is woken once to plan. If the team stays idle,
  the owner (the user) is told. Both are capped with backoff, so an idle team never loops.
- A bot can hand off: it writes a state doc, its context resets, and it resumes from the doc.
- An idle bot over a token limit (150k by default) hands off and clears by itself. A busy bot is never cleared.
- The user sees every bot's state (busy, asking, held, idle), the queue, open PRs by who acts next, and a
  standup report, on web, desktop and mobile.

## What exists today

- **Groups.** `Group` ([`roster.ts`][roster]) has members and `bossBotId`. `group.create` takes the boss
  ([`rosterCommands.ts`][roster-commands]). Addressing, "who is next" and the reply budget
  (`thread.hop-budget.set`) are in [group-chats.md](./group-chats.md).
- **The responder queue.** `GroupResponderQueueReactor` ([source][responder-reactor]) runs a group chat's
  queue one bot at a time. It notices when a queued chat's session stops running, hands the reply to the decider
  and asks it to start the next bot. On start it advances any queue a restart left stranded. This is the
  pattern the dispatcher follows.
- **Reactors and receipts.** `OrchestrationReactor` ([source][orchestration-reactor]) starts the provider
  command, checkpoint, group responder and thread deletion reactors. `RuntimeReceiptBus`
  ([source][receipt-bus]) carries typed receipts; `TurnProcessingQuiescedReceipt` marks a turn whose side
  effects are done.
- **Turn state.** A thread shell has `latestTurn` (running, completed, interrupted, error) and
  `hasPendingApprovals` / `hasPendingUserInput` ([`readModel.ts`][read-model]). The web roster derives a bot's
  activity in `BotActivityStatus`, and the Decisions group derives "waiting on you" in
  `packages/client-runtime/src/decisions.ts`.
- **Context size.** Each turn appends a `context-window.updated` activity with `usedTokens` and `maxTokens`
  ([`ActivityMapping.ts`][activity-mapping]). The web reads it in `apps/web/src/lib/contextWindow.ts`.
- **Context assembly.** Mastra providers already cap what a turn sees: bot memory, observations, and up to 30
  recent turns within about 64,000 tokens ([memory.md](./memory.md#context-assembly)). Nothing lets a bot reset
  its own context or carry a state doc across a reset.
- **Interrupt.** `thread.turn.interrupt` and `thread.session.stop` exist. There is no "all bots in this group"
  form and no palette entry.
- **Routines** ([`apps/server/src/routines`][routines]) run scheduled work and can carry the standup.
- **Delegation** ([delegation.md](./delegation.md)) runs child threads and waits on them. A work queue,
  owners, item states and a tracker link do not exist. A thread can hold one linked pull request (migrations 042
  and 044); there is no PR list.
- **Silence watchdog** ([silence-watchdog.md](./silence-watchdog.md)) reports a silent running turn and never
  interrupts it. Nothing wakes an idle bot.

## Decisions

### The server owns the loop

All twelve behaviours run on the server, so they keep working when every client is closed, on a remote
environment, and from mobile. Clients only show state and send commands.

Rejected: **a client-side scheduler.** It stops when the laptop sleeps, and two clients would dispatch twice.

### Work items are their own aggregate (TASK-87)

A work item belongs to one group: `{ id, groupId, title, brief, kind: "task" | "bug", role?, ownerBotId?,
state, trackerLink?, threadId?, prUrl?, createdAt, updatedAt }`.

- `state` is `queued`, `assigned`, `in-progress`, `blocked`, `review`, `done` or `closed`. `blocked` carries
  who unblocks it. `closed` is a dropped item; `done` is a finished one. Both can be reopened.
- Board columns: New = queued + assigned; In progress = in-progress + blocked; Draft = review; Done; Closed.
  `workItemColumn(state)` in `packages/client-runtime/src/space/workItems.ts` is the one mapping.
- A group holds at most 200 open items (anything but done or closed). Creating or reopening past that fails
  with "This space has 200 open items. Close some first."
- The shell snapshot and stream carry open items as `WorkItemSummary`: the item without its brief, plus a
  `briefPreview` of at most 280 characters cut at a word boundary. A client fetches the full brief with
  `workItems.get({ workItemId })` (read scope) when the item is opened. Bot tools run on the server and read
  the full brief directly.
- The shell snapshot and stream carry open items only; `work-item-removed` fires when an item goes done or
  closed, or is deleted. `workItems.list({ groupId, state, cursor?, limit <= 50 })` pages the done and closed
  items, newest first, and `workItems.counts({ groupId, since })` returns `{ open, inProgress, doneSince }`.
  Both need the orchestration read scope.
- `trackerLink` is a GitHub issue or PR URL, a Jira key, or nothing. Isnadi stores the link and shows it; it
  does not sync the tracker in this epic.
- Commands `work-item.create`, `.assign`, `.update`, `.block`, `.unblock`, `.close`, `.reopen`. Events and a
  `projection_work_items` table follow the existing pattern.
- The boss and the user add items. The boss gets Mastra tools `add_work_item` and `assign_work_item`; a bot
  moves its own item with `update_work_item`.

Rejected: **reusing delegation threads as the queue.** A delegation is one running child turn with a waiter. A
queued item has no thread yet, may wait for days, and may be reassigned.

### The dispatcher (TASK-86)

`FleetDispatcherReactor` is a queue-backed reactor next to `GroupResponderQueueReactor`. It reacts to
`TurnProcessingQuiescedReceipt` for a bot in a group, and to `work-item.*` events.

When a bot goes idle (no running turn, nothing pending, no item in progress):

1. If a queued item matches its role (or has no role and the bot is not the boss), plain code assigns the
   oldest one and starts a turn in the bot's chat with the item's brief. No model call.
2. If items are queued but none matches, or several bots could take one, the boss is woken once with the
   choice: judgement, not routing.
3. If the whole team is idle and the queue is empty, the boss is woken once to plan the next work. If the team
   is still idle after the boss's turn, the owner is told through the bot inbox and push.

Wakes are capped. The second boss wake for an idle team waits 15 minutes, doubling up to 4 hours. Any user
message or new item resets the backoff. Each decision emits a `fleet.dispatch.decided` receipt naming what it
did, so tests wait on receipts and never on sleeps.

The dispatcher is off until the user switches on **Keep busy** for the group. A fleet hired from a template
starts with it on.

Like the responder reactor, it reads every group once on start, so a restart does not strand an idle team.

### Handoff (TASK-84)

A bot hands off with a Mastra tool `handoff({ item, branch, done, nextStep, waitingOn, doNot })`.

1. The server stores the doc as the thread's handoff state and appends it to the chat as an activity, so the
   user can read it.
2. `thread.context.reset` advances the thread's context epoch. Turns before the epoch, and the thread's
   observations, no longer reach the model. The visible transcript stays.
3. The next turn's context starts with the handoff doc, then follows the normal assembly.

The user can hand off any bot from its chat menu, which asks the bot to call `handoff` and then resets.
Standard OpenCode, which keeps its own session, gets a new OpenCode session with the doc as its first message.

Rejected: **deleting turns or starting a new chat.** It loses the record the user reads, checkpoints and
delegation links.

### Auto clear (TASK-85)

On `TurnProcessingQuiescedReceipt`, if the turn's `usedTokens` is over the group's limit (default 150,000) and
the bot is idle (no running turn, nothing pending, not mid-delegation), the server asks it to hand off, then
resets. A busy or asking bot is skipped and checked again after its next turn. The limit is a group setting;
0 turns it off.

### Bot status (TASK-83)

A bot's state is derived in `packages/client-runtime`, with no new server state:

- **busy:** a running turn;
- **asking:** a pending approval or question (the Decisions rule);
- **held:** its in-progress item is `blocked`, or it waits on children;
- **idle:** none of these.

The capacity view per group shows each bot's state, its item, its context use and the queue length. It
replaces the per-bot activity line only inside a fleet group.

### Standup (TASK-88)

A built-in routine, added when a fleet is hired, runs at 09:00 local on weekdays. The boss posts one short
report in the group chat: capacity (who is busy, asking, held, idle), the queue, blockers and who unblocks
each, and PRs waiting. The user can change its time or turn it off like any routine.

### PR queue (TASK-89)

The PR queue lists open PRs from work items' `prUrl` and threads' linked pull requests, and reads their state
through the existing source-control process (`gh`). It sorts by who acts next: the author when checks are red
or changes are requested, the reviewer when it waits on review, the merger when it is approved and green.
GitHub only in this epic; other forges show the link without a state.

### Scale (TASK-90)

Add a bot of a role (from the role library, TASK-92) or remove one. Before either, the capacity view shows the
team's state. Removing a bot moves its assigned and queued items back to `queued` with no owner, and the
dispatcher reassigns them. A bot that is busy is removed after its turn ends.

### Triage (TASK-91)

A `bug` item goes to the group's architect-role bot for root cause, never to the boss. With no architect in
the group, it goes to the boss as a judgement wake.

### Role library (TASK-92)

Roles and fleet templates are data in `packages/contracts`: each role has a name, a one-line description, a
default model and reasoning level, and default skills ([skills-registry.md](./skills-registry.md)). Each
template lists its roles and its boss. The hire flow reads them and seeds squad setup; nothing writes back to
the library.

### Team rules (TASK-93)

A group holds `teamRules`, plain text that the hire flow seeds from the template: the report format, one merge
gate, one worktree per item, skills first. It is joined into every member's instructions in group
conversations, after bot instructions and before memory. The user edits it in group settings.

### Interrupt, steer and clear (TASK-94)

From a bot's chat menu, the group menu and the command palette:

- **Interrupt** sends `thread.turn.interrupt` to one bot, or to every running bot in the group.
- **Steer** interrupts and then sends the user's message to the same bot.
- **Clear** runs the handoff flow, or with "without handoff", resets the context epoch directly.

## Contracts

- `packages/contracts/src/orchestration/workItems.ts`: the work item, its commands and events.
- `Group` gains `keepBusy: boolean`, `contextClearLimit: number` and `teamRules: string`, each with a
  decoding default so stored groups still decode.
- Thread gains `contextEpoch` and `handoff` (the latest doc), with a decoding default.
- Receipt `fleet.dispatch.decided` in `RuntimeReceiptBus`.
- Roles and templates in `packages/contracts/src/fleet/roles.ts`.

## Clients

- **Web and desktop:** the capacity view, the queue and PR queue tabs on the group, Keep busy and the clear
  limit in group settings, team rules, the hand off, interrupt, steer and clear actions, and their palette
  entries.
- **Mobile:** the capacity view, the queue and PR queue (read and reassign), Keep busy, and interrupt and clear
  per bot.
- Shared status and sort logic lives in `packages/client-runtime`.

## Reverse states

- Keep busy can be switched off; in-flight turns finish and nothing new is assigned.
- A blocked item can be unblocked, a done item reopened, an assigned item unassigned.
- Auto clear is off at limit 0. A handoff doc stays visible in the chat after the reset.
- A removed bot's items return to the queue.

## What must not change

- The group responder queue, addressing and the reply budget. The dispatcher starts turns only for idle bots
  and never inside a responder queue that is running.
- The visible transcript, checkpoints and delegation links survive a context reset.
- A group without Keep busy behaves exactly as today.

## Security

- A dispatched turn runs with the bot's own permissions and runtime mode. The dispatcher never raises them.
- Work item briefs written by a bot are bot-authored text. They reach other bots as a user turn from the
  dispatcher, labelled as such in the chat, never as instructions.
- `gh` runs with the environment's own credentials. The PR queue reads; it never merges or comments.

## Testing

- Decider and projection for every work item command, including reopen and unassign.
- Dispatcher: idle bot with a matching item, no match, idle team with an empty queue, the backoff, a restart
  with an idle team. Each waits on `fleet.dispatch.decided`.
- Handoff and reset: turns before the epoch and the observations are left out of the next context; the
  transcript and checkpoints are untouched.
- Auto clear skips busy and asking bots and runs after their next idle turn.
- Status derivation in `packages/client-runtime`, shared by web and mobile.
- Web and mobile verified in isolated clients ([verification.md](./verification.md)).

## Role library

`packages/contracts/src/fleet/roles.ts` holds the built-in roles (`FLEET_ROLES`) and the six squad templates (`FLEET_TEMPLATES`). A role is a name, a one-line job, an avatar, a driver kind with a model, a reasoning level, and a skill list. It names a driver, not a provider instance, because instances differ per environment. `skills` stays empty until the skill registry lands (TASK-123.2).

`seedSquad` in `packages/client-runtime/src/fleet/squadSeed.ts` turns a template into engines for the connected providers, boss first. It uses the first ready instance of the role's driver. Otherwise it uses any ready instance with that instance's default model and returns a `provider-fallback` notice. If the model lacks the role's reasoning level it takes the model's default and returns `reasoning-adjusted`. With no ready provider the engine is null and the notice is `no-provider`. Nothing here crosses the wire. Web and mobile share it.

## Slices

| Card               | Slice                              | After            |
| ------------------ | ---------------------------------- | ---------------- |
| TASK-92            | role library and templates         | —                |
| TASK-124, 125, 126 | hire a fleet (web, design, mobile) | TASK-92          |
| TASK-83            | bot status and the capacity view   | —                |
| TASK-87            | work items and the queue           | —                |
| TASK-86            | the dispatcher and Keep busy       | TASK-83, TASK-87 |
| TASK-84            | handoff and the context epoch      | —                |
| TASK-85            | auto clear                         | TASK-84          |
| TASK-94            | interrupt, steer and clear         | TASK-84          |
| TASK-91            | triage                             | TASK-86          |
| TASK-90            | scale                              | TASK-87, TASK-92 |
| TASK-89            | PR queue                           | TASK-87          |
| TASK-88            | standup                            | TASK-83, TASK-87 |
| TASK-93            | team rules                         | TASK-92          |

## Open questions

- Team rules per group or per space. The card says per space; a fleet is one group in one project today, so
  per group is the same thing until a project holds two fleets.
- Whether the owner notice for an idle team also posts in a connected channel (Slack, Telegram).

[roster]: ../../packages/contracts/src/orchestration/roster.ts
[roster-commands]: ../../packages/contracts/src/orchestration/rosterCommands.ts
[responder-reactor]: ../../apps/server/src/orchestration/Layers/GroupResponderQueueReactor.ts
[orchestration-reactor]: ../../apps/server/src/orchestration/Layers/OrchestrationReactor.ts
[receipt-bus]: ../../apps/server/src/orchestration/Services/RuntimeReceiptBus.ts
[read-model]: ../../packages/contracts/src/orchestration/readModel.ts
[activity-mapping]: ../../apps/server/src/orchestration/Layers/runtime-ingestion/ActivityMapping.ts
[routines]: ../../apps/server/src/routines/
