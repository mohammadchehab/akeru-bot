# Group chats

A group chat is one thread shared by a boss bot, specialist bots and people. Each turn has one
responding bot. This page covers who answers a message, what that bot is told about the group, and
how it reads the messages other members wrote. Delegation inside a group is in [delegation.md](delegation.md);
group memory files are in [memory.md](memory.md).

## Addressing

A user message in a group says who should answer. The client sends that intent; the server decides
who answers and in what order, so web, desktop, mobile and channels behave the same.

| The user writes                    | Addressing           | Who answers                                               |
| ---------------------------------- | -------------------- | --------------------------------------------------------- |
| No mention                         | `auto`               | The group picks one member, rarely two (see Auto routing) |
| `@Bot2 …`                          | `bots: [Bot2]`       | Bot2                                                      |
| `@Bot2 @Bot3 …`                    | `bots: [Bot2, Bot3]` | Bot2, then Bot3                                           |
| `@everyone …`                      | `everyone`           | Every active bot member, boss first, then in member order |
| Reply on Bot2's message            | `reply: <messageId>` | Bot2 (the message's `respondingBotId`)                    |
| Answer to a bot's question or form | `reply: <messageId>` | The bot that asked                                        |

The turn-start command carries `addressing` in place of a client-chosen `respondingBotId`. Mentions
resolve to bot ids against active members on the server. A mention of a bot that is not an active
member fails the command with a message that names it; it is not silently dropped.

### Contract

`ClientThreadTurnStartCommand` and `ThreadTurnStartCommand` (`packages/contracts/src/orchestration/`)
gain an optional `addressing`:

```ts
type GroupAddressing =
  | { kind: "auto" }
  | { kind: "bots"; botIds: NonEmptyArray<BotId> } // in mention order, duplicates removed
  | { kind: "everyone" }
  | { kind: "reply"; messageId: MessageId };
```

- No `addressing` in a group means `auto`. A direct chat ignores it: its one bot answers.
- Clients send the bot ids from the composer's mention chips. They never send display names, because
  names can repeat or change. Channel messages arrive as text, so the server parses their `@name`
  mentions with the same parser chains use, against active members.
- `reply` names a message in the same thread. A user message, or one with no `respondingBotId`,
  fails the command.
- Mobile starts a reply with a long-press on a bot message in a group chat (Reply or Cancel in a
  native sheet, plus a "Reply" accessibility action). Only messages with a `respondingBotId`
  qualify; user messages, older messages and direct chats offer nothing. The target is held in
  memory per chat, not in the draft, and clears on send, on the chip's X, when the chat changes,
  or when the message leaves the read model. A mention in the draft beats the reply, and the chip
  then reads "Quoting".
- Compatibility: until the clients send `addressing`, a `respondingBotId` alone is read as
  `bots: [respondingBotId]`. Sending both fails the command. The field is removed once web and
  mobile send `addressing`.

The queue is part of the thread read model, `responderQueue`, and one event replaces the whole queue
each time it changes, `thread.responder-queue.set`:
`{ threadId, entries: [{ botId, trigger }], hopsLeft, hopsUsed, budgetExhausted?, reason, updatedAt }`,
where `reason` says why the queue last changed:
`addressed | mention | turn-started | stopped | superseded | budget-exhausted`. A single replacing
event keeps the projector trivial and lets a client that reconnects render the queue from one value.

### The responder queue

The server keeps one responder queue per group chat. Addressing fills it, and it runs one turn at a
time: each queued bot gets a turn with no new user message, and it reads everything before it
through the shared history. The provider session runs as the current responder; when the responder
changes, the provider command reactor restarts the session as the new bot
(`apps/server/src/orchestration/Layers/provider-command/Session.ts`) after the active turn ends.

The next queued bot starts only once the turn the queue last started has ended, including a turn
whose session failed to start. A duplicate advance is then a no-op. A queued bot that left the group
or was archived is skipped, and the first active bot behind it starts.

The decider records `respondingBotId` and the turn's trigger on each turn:
`{ kind: "user", messageId }`, or `{ kind: "bot-mention", sourceTurnId, sourceBotId }`. Clients join
an assistant message to its turn by `turnId`, so the message does not repeat it.

### Mentions and chains

When a group turn completes, the server reads the reply's mentions of active members and appends
each one to the queue, in order. This is how one bot asks another ("@Becky, cheapest test that
doesn't need him to film?") and that bot answers next.

Rules:

- A bot never queues itself.
- Mentions inside code spans, code blocks and quoted lines (`> ...`) don't count, so a bot that
  echoes the user's "@Becky ..." does not queue Becky again. The server strips them before reading
  the reply (`botReplyMentionText` in `packages/shared`).
- Bots cannot address `@everyone`. The token is ignored in a reply, and the members it names beside
  it still queue.
- A name shared by two members is ambiguous, and a reply cannot disambiguate it, so it queues
  nobody. Where one name starts another ("Bo" and "Bo Two"), the longest name at that position is
  the one meant.
- The hand-over is read from the reply when the turn ends and is held in memory until then. A server
  restart between the reply and the end of the turn drops it, and the chain stops there.
- A bot already waiting in the queue is not added twice.
- A mention runs to the first character that cannot be part of a member name, so `@Becky,` counts.
  A typed `@bot:<id>` ends the same way: an id may contain `.` `:` `-` `_` inside but starts and ends
  with a letter or digit. The composer, channel text and chains share one parser.
- **Hop budget:** each user message allows at most N bot turns in total, including the first ones.
  N is a per-chat setting, default 6, because every bot reply counts toward the user's usage. The
  group thread carries it as `hopBudget` (an integer from 1 to 20). A thread command changes it,
  with the same authorization as other group-thread changes. It is in the read model, so every
  client shows it in the chat's settings. A chat with no value uses 6.
  A group can carry its own `hopBudget` (set by `group.create`); a new chat in that group copies it
  when `thread.create` runs. Later changes to the group do not touch existing chats.
  - Every turn the queue starts for that message counts, whether addressing or a mention added it.
    Delegation `send` and the auto routing call do not count.
  - The bots a user names, or `@everyone`, always run, even past the budget. The budget only limits
    what mentions add: a mentioned bot is queued only while `hopsLeft` is above 0.
  - Every user message, a Reply included, starts a fresh budget, read from the setting at that
    moment. Stop clears the queue and keeps `hopsLeft` as it was.
  - `hopsLeft` is the budget minus the turns already started. The decider lowers it at each turn
    start, so the queue on the wire is always true.
  - `hopsUsed` is the number of turns the queue has started for the message, so a client can say
    how many replies ran without counting.
  - The budget gates only mention-triggered entries, so a bot the user named is never removed. When
    a finished reply mentions a bot and `hopsLeft` (less the entries already waiting) leaves no room,
    the decider drops that mention and sets the sticky queue field `budgetExhausted: true`. Every
    queue event for the same user message copies it, and the next user message starts without it.
    `reason` stays the usual "why it last changed"; `budget-exhausted` is the reason only on the
    event that leaves the queue empty because of the budget.
  - Clients show "Stopped after N replies" (N is `hopsUsed`) under the last reply while the queue is
    empty and `budgetExhausted` is true. They render it from the queue and never count on their
    own, so it survives a reconnect. An emptied queue is left off the wire unless `budgetExhausted`
    is true, and the next queue event replaces it.
- A chain ends when a reply mentions nobody new.

Delegation stays separate: `send` hands background work to a member's own chat and posts the result
here ([delegation.md](delegation.md)). A mention passes the floor in the group; it starts no
background work.

### Auto routing

With no mention, one structured routing call picks the responders. It runs on the boss's provider
and model, takes the roster (names, titles, descriptions) and the last few messages, and returns one
bot id, or two when the message plainly needs both. The call has no tools and a short timeout. If it
fails, times out, or returns a bot that is not an active member, the boss answers. The pick is
recorded on the turn, so the chat can show why that bot answered.

### Seeing and stopping it

- While the queue is not empty, the chat shows who is answering and who is next ("Becky is next").
- **Stop** ends the current turn and clears the queue.
- A new user message clears the queue too: what is still waiting was for the old message. The new
  message is then addressed as usual.
- Queue changes are events, so every connected client sees the same queue.

### Options rejected

- **The client picks the responder and sends one turn per bot.** This is how the app works today. Web,
  mobile and channels would each need the same logic, two clients could interleave turns, and a bot
  reply could never pass the floor.
- **Mentioned bots answer in parallel.** A group has one provider session and one ordered history, so
  later bots could not read earlier answers. It would also multiply usage at once.
- **The server parses `@name` from the text for every client.** Names are not unique and can change.
  Chips carry ids, and only channels, which have nothing better, fall back to parsing.
- **Bots reach each other only through delegation `send`.** `send` starts background work in the
  member's own chat. It does not answer in the group, and the user cannot see a conversation between
  the bots.

## One shared history

All bots in a group read one conversation. The Mastra memory thread is keyed by the thread id
(`SessionLifecycle.ts`, `key = String(threadId)`), and the recall processor
(`provider/mastra/IsnadiMemory.ts`, `processInputStep`) loads recent turns from it for every
responder. Keep it that way: a bot that answers in a group must see what the others said.

Provider history stores messages as `user` and `assistant`. In a group, `assistant` is ambiguous: it
means "some bot", and the model reads every `assistant` message as its own. Without attribution,
Bot2 reads Bot1's reply as something it said ("my last message was wrong: I am Bot2").

### Speaker attribution

Every assistant message saved to provider memory in a group carries its speaker:
`content.metadata.respondingBotId`. That covers all three save paths:

- `IsnadiPassiveObservationalMemoryProcessor.processOutputResult` (`IsnadiMemory.ts`), for live
  turns: the responder from the request context.
- `persistExternalConversationTurn` (`provider/mastra/IsnadiConversation.ts`), for turns that ran
  elsewhere.
- The rollback rebuild (`provider/Layers/agentController/Conversation.ts`), which copies the
  projection message's `respondingBotId`.

The recall processor rewrites history for the current responder, at recall time and never in
storage:

| Saved message                                                    | What the responder sees                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `assistant` from the responder                                   | unchanged                                                                          |
| `assistant` from another bot                                     | `user` role, text only: `<group-message from="Bot1" role="boss">…</group-message>` |
| `assistant` with no `respondingBotId` (saved before this change) | unchanged                                                                          |
| `user`                                                           | unchanged                                                                          |

Another bot's tool calls and tool results are dropped. Only its text is kept. They belong to that
bot's tools and session, and a tool result without its own tool call is invalid provider input.

Direct (one-bot) chats are not rewritten.

Why at recall time, and not by writing a name into the saved text:

- Each responder needs a different view of the same history: its own turns are `assistant`, the
  others' are not.
- Stored text stays clean for summaries, export and observational memory.
- The model never sees a name prefix on its own turns, so it doesn't learn to write one.

### Roster

In a group, the instructions gain a group section, built at each turn from the group record (the
Mastra instructions resolver runs per call, `IsnadiMastraHarness.ts`):

- the group's name;
- each active bot member: name, bot id, boss or specialist, and title;
- each person: display name;
- the rules: "You are <name>. Answer only as yourself. Messages from other members appear as
  `<group-message from=…>`. A message with no @mention goes to the boss. To hand work to a member,
  use its bot id."

Build the roster per turn, not at session start, so adding or removing a member takes effect on
the next turn without a restart. Direct chats get no group section.

## Delivery slices

Each slice is one PR. Explicit addressing (b1, c, d) ships in 0.0.3.

- **b1.** The `addressing` contract, the decider and the queue for `bots`, `everyone` and `reply`,
  `thread.responder-queue.set`, and `trigger` on turns. Stop and a new user message clear the queue.
  `auto` still means the boss.
- **b2.** Chains: mentions in bot replies, the per-chat `hopBudget` setting, and `budget-exhausted`.
  b1 uses a fixed budget of 6.
- **b3.** The auto routing call and its fallback.
- **c.** The web composer (mention chips, `@everyone`, the reply action), "X is next", and Stop. Then
  mobile.
- **d.** End-to-end journeys, one per addressing row, plus a chain and a budget stop once b2 lands.

## What must not change

- One turn at a time per group chat; the queue never runs two bots at once.
- One memory thread per group chat. History is not split per bot.
- Memory access scopes (`MemoryAccess.ts`, `groupMemberBotIds`).
- Direct chats: no rewriting and no group section.

## Providers

Codex, Claude, Grok, Kimi For Coding and OpenCode Go run through the Mastra controller and get this
behaviour. Standard OpenCode uses the legacy adapter bridge, which has its own history. It needs its
own check, and it is not part of this change.

Addressing, the responder queue and chains live in orchestration, so they work the same for every
provider. Auto routing needs a structured call on the boss's provider; when the boss runs on the
legacy bridge, auto routing falls back to the boss.

## Security notes

- The roster gives the bot only what the group's members can already see: names, titles and bot ids
  of members.
- People's display names go to the provider, the same as the messages they write.
- A bot could write a fake `<group-message from="Bot1">` tag in its reply. That text reaches others
  inside its own `<group-message from="Bot2">` wrapper, so the real speaker stays visible.
  Escape `<group-message` in the wrapped text.
- Chains spend the user's usage. The hop budget caps it per user message, and Stop clears the queue.
- A bot's reply cannot address a bot outside the group: mentions resolve against active members only.

## Tests

- Recall rewrite (unit, `IsnadiMemory` processor). In a group thread:
  - the responder's own assistant turns stay `assistant`;
  - another bot's turns become `user` with the wrapper and no tool parts;
  - a message without metadata is unchanged.
  - A direct chat is not rewritten.
- Save paths (unit): live, external and rollback-rebuilt assistant messages carry
  `respondingBotId` in a group.
- Instructions (unit): the group section lists members and ids in a group and is absent in a direct
  chat. A member added between turns shows up on the next turn.
- Reactor (integration, `ProviderCommandHarness`): turn 1 to Bot1, then turn 2 to Bot2. Bot2's
  provider input has Bot1's reply wrapped as `from="Bot1"`, not as an `assistant` message.
- End to end (web, stub provider): `@Bot2 hi` after a Bot1 reply. The stub's request shows the
  wrapper, and Bot2's reply is labelled Bot2 live and after a reload.

- Addressing (decider, unit): `auto`, `bots`, `everyone` and `reply` fill the queue in the order in
  the table; an unknown or inactive mention fails the command.
- Chains (reactor, receipt-driven): a reply that mentions Bot2 queues Bot2, whose turn runs next with
  a `bot-mention` trigger. Self-mentions, mentions in code or quotes, and duplicates are ignored. A
  loop between two bots stops at the hop budget. Stop and a new user message clear the queue.
- Auto routing (unit): a valid pick is used; a failure, timeout or non-member pick falls back to the
  boss.
- End to end (web, then mobile, stub provider), one journey per row of the addressing table, plus
  one chain and one budget stop.

## Open questions

- In a group with several people, should `user` messages also carry the author's name? Today a
  group has one person in practice. Defer until channels bring several people into one group.
- Should the hop budget default be 6? It matches a group of up to six bots each answering once.
  Mohammad decides (board card group-hop-budget). b1 does not depend on the answer.
