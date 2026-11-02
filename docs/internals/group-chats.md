# Group chats

A group chat is one thread shared by a boss bot, specialist bots and people. Each turn has one
responding bot. This page covers what that bot is told about the group and how it reads the
messages other members wrote. Delegation inside a group is in [delegation.md](delegation.md);
group memory files are in [memory.md](memory.md).

## Routing

The client picks the responder before it sends the turn
(`apps/web/src/components/roster/useGroupThreadRuntime.ts`): an `@mention` of an active member
selects that member, and no mention selects the boss. There is no broadcast: "hi all" is answered
by the boss alone. The decider records `respondingBotId` on the turn and on the assistant message.

The provider session runs as the responder. When the responder changes, the provider command
reactor restarts the session as the new bot
(`apps/server/src/orchestration/Layers/provider-command/Session.ts`), and it waits while a turn is
active.

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

## What must not change

- Routing: no mention → boss; one mention → that member.
- One memory thread per group chat. History is not split per bot.
- Memory access scopes (`MemoryAccess.ts`, `groupMemberBotIds`).
- Direct chats: no rewriting and no group section.

## Providers

Codex, Claude, Grok, Kimi For Coding and OpenCode Go run through the Mastra controller and get this
behaviour. Standard OpenCode uses the legacy adapter bridge, which has its own history. It needs its
own check, and it is not part of this change.

## Security notes

- The roster gives the bot only what the group's members can already see: names, titles and bot ids
  of members.
- People's display names go to the provider, the same as the messages they write.
- A bot could write a fake `<group-message from="Bot1">` tag in its reply. That text reaches others
  inside its own `<group-message from="Bot2">` wrapper, so the real speaker stays visible.
  Escape `<group-message` in the wrapped text.

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

## Open questions

- In a group with several people, should `user` messages also carry the author's name? Today a
  group has one person in practice. Defer until channels bring several people into one group.
