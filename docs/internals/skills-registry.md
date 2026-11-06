# Skills registry

> For maintainers. Design for E14, the skills registry (decisions D22 and D28).
> Using IsnadiBot? See [docs/user](../user/).

A skill lives once in the environment. It is switched on per bot, and every provider sees the same set, so a
bot that falls back from Claude to another model keeps its skills. Today a skill is whatever the bot's provider
happens to find on disk, and it is lost when the engine changes.

## Goal

- One registry per environment lists every skill: built in, this space's, yours (all spaces), Community and
  each provider's. Local, remote, tunnel and mobile clients all read the same list from the server.
- Each bot has its own set of skills, each on or off. The set is the same on Codex, Claude, Grok, Kimi For
  Coding, OpenCode Go, Custom API and standard OpenCode.
- A bot loads a skill only when it needs it. The bot's instructions carry a short index; the body arrives
  through a tool call, and each load shows in the chat.
- You can add a skill from a provider's folder, a GitHub URL or a .zip, to one space or to all of them, and
  remove it again.
- A Community skill reaches no bot until you approve it, and a changed one needs approval again (D28).
- A skill that needs a connector says so before the bot fails halfway through a task.

D22 (accepted): all four milestones ship in the sprint. D28 (accepted): Option A, approve when you add it.

## What exists today

- A skill is only a catalog entry that a provider reports. `ServerProviderSkill`
  ([`server/providers.ts`][contracts-providers]) has a name, a description, the `SKILL.md` path and `enabled`.
  - Claude scans `~/.claude/skills`, `<cwd>/.agents/skills` and `<cwd>/.claude/skills`
    ([`ClaudeSkills.ts`][claude-skills]).
  - Codex asks its app server (`skills/list`), Grok runs `grok inspect --json` ([`GrokSkills.ts`][grok-skills]),
    and standard OpenCode calls `client.app.skills()` ([`opencodeRuntime.ts`][opencode-runtime]).
  - Kimi For Coding, OpenCode Go and Custom API report `[]`.
- Isnadi stores no skill, never loads a skill's text and never exports one. The Isnadi home has no `skills`
  directory.
- A bot has no skills field. The closest precedent is `disabledMcpServerIds`
  ([migration 051][migration-051]).
- `RoutineSkillAssignment` (`SkillId` in [`routines.ts`][routines]) only checks a dependency when a routine
  runs. No skill text reaches a prompt.
- Codex, Claude, Grok, Kimi For Coding, OpenCode Go and Custom API run through the Mastra harness. Tools come
  from `resolveIsnadiTools` ([`IsnadiTools.ts`][isnadi-tools]) and instructions from
  `resolveIsnadiInstructions` ([`IsnadiInstructions.ts`][isnadi-instructions]). Standard OpenCode runs on the
  legacy adapter and gets nothing from Isnadi beyond `OPENCODE_CONFIG_CONTENT`.
- The composer's `$` trigger exists ([`composerTrigger.ts`][composer-trigger]). It lists the provider
  snapshot's skills; a group chat lists the boss's. On Claude a picked skill is sent as a trailing `/name`
  command ([`ClaudeSkillDispatch.ts`][claude-dispatch]), Codex reads `$name` natively, and every other
  provider gets `$name` as plain text. The slash menu also lists skills unless **Show skills in slash menu**
  (`showSkillsInSlashMenu`, Settings › General) is off; mobile ignores that setting. No Settings page lists
  skills.

## Decisions

### A skill is a folder

A skill is a folder holding a `SKILL.md` and its files. The frontmatter has `name`, `description` and an
optional `requires` (connector ids). This is the format Claude, Codex and Grok already read, so an imported
skill needs no conversion.

### Sources and where their files live

| Source             | Files                                                                | Written by               |
| ------------------ | -------------------------------------------------------------------- | ------------------------ |
| Built in           | shipped with the server, read-only                                   | release                  |
| Space              | `<project>/.isnadi/skills/<name>/`, so it travels with the project   | Add skill (this space)   |
| Yours (all spaces) | `<userdata>/skills/<name>/`, folders 0700, files 0600                | Add skill (all spaces)   |
| Community          | the same two places, with `origin` = the URL and commit it came from | Add skill (GitHub, .zip) |
| Provider           | read in place from the path the driver reports, never copied         | the provider             |

A space in the design is a project, so a space skill lives under the project's `.isnadi` directory and inside
the `.isnadi` data boundary.

### The server owns the registry

A `SkillRegistry` service on the server builds the list, so every client sees one answer.

- Store and Community skills are recorded by commands and events (`skill.added`, `skill.removed`,
  `skill.approved`) in a `projection_skills` table: id, name, source, scope, origin, content hash, approval.
- Space, built-in and provider skills are found by scanning. The scan reruns when a project opens and when a
  provider snapshot changes.

Rejected: **a list each client builds from provider snapshots.** A remote browser cannot see the server's
files, and mobile would drift from web, as it already does with `showSkillsInSlashMenu`.

### Identity and precedence

`SkillId` is `<source>:<scope>:<name>`. A name found in more than one place resolves in this order: space,
yours, built in, provider. The list shows every copy and marks the winner; the index uses the winner.

### Content hash

The content hash is the sha256 of the sorted file paths and their bytes. D28's approval pin and the "changed
since you approved it" state both use it. The registry recomputes it on every rescan.

### Per-bot skills

A bot gains two fields:

- `skills: Array<{ skillId, enabled }>`: the bot's set as screen 3b shows it, each skill on or off.
- `skillRegistryAccess: boolean`: the "Use other skills from the registry" switch.

Both travel on `bot.update` and are stored in `projection_bots.skills_json` by a new migration. Stored bots
decode with `[]` and `false`. Removing a skill from the registry emits an event that takes it out of every
bot's set, so no bot keeps a dangling id.

A bot hired from a fleet starts with its role's default skills (TASK-92). "Reset to role defaults" stays
hidden until role defaults exist.

### The index and two tools (Mastra providers)

`IsnadiMastraState` gains `skillIndex`, which `resolveIsnadiInstructions` joins into the bot's instructions.
Each entry is the skill's name and one-line description, about 30 tokens. The index lists the bot's enabled
skills, plus every approved registry skill when `skillRegistryAccess` is on. An unapproved or changed
Community skill never appears in it.

Two tools sit next to the routine tools in `resolveIsnadiTools`:

- `load_skill({ name })` returns the `SKILL.md` body without its frontmatter.
- `read_skill_file({ name, path })` returns one text file inside the skill folder. The resolved real path
  must stay inside the skill root, so `..`, absolute paths and symlinks that leave the root are refused. A
  file is capped at 256 KB.

Both refuse a skill that is not in this bot's index. Both emit a thread activity, so each load shows in the
chat as "Loaded <skill>", and both update the registry's "Used by" and "Last loaded".

The index and the tools do not depend on the provider. That is what keeps a bot's skills when its engine falls
back ([model-fallback.md](./model-fallback.md)).

Rejected:

- **Putting every enabled skill's full text in the instructions.** A bot with ten skills would pay tens of
  thousands of tokens on every turn, and the providers that already load skills lazily would get worse.
- **Copying skills into each provider's own folder.** It writes into `~/.claude` and `~/.codex`, which the
  registry must only read, and Kimi For Coding, OpenCode Go and Custom API have no such folder.

### Add and remove

Add skill sits on the space Skills tab and in Settings › Skills.

- **Import from Claude, Codex or Grok.** The server copies a provider skill into the chosen scope and leaves the
  original where it is. Not Community.
- **From a GitHub URL** (Community). The server resolves the ref to a commit SHA and fetches that SHA's
  tarball over https. It extracts only the skill's path.
- **Upload a .zip** (Community). The client sends the bytes over RPC, so it works from a remote browser.
  Mobile has no .zip upload.
- **Limits for both archives:** 5 MB and 200 files. Symlinks, hardlinks, absolute paths, `..` and exec bits are
  rejected, not stripped.
- **Scope:** this space or all spaces.
- **A name clash in the same scope** asks you to replace or rename. Nothing is overwritten silently.
- **Remove,** from the row menu on screen 3c, deletes the copy in that scope. A provider's original is never
  deleted.

### Community approval (D28)

Adding a Community skill opens an approval dialog with its source URL and commit, the full `SKILL.md` and the
file list. Approve records `skill.approved` with the content hash. Cancel removes the files that were added.

The server enforces the gate, not the client. A Community skill whose current hash differs from its approved
hash, or that has none, is:

- left out of every bot's index;
- refused by `load_skill`, `read_skill_file` and `$`;
- never copied to a standard OpenCode folder.

When a rescan finds a new hash, the row shows "Needs approval". Its dialog shows which files were added,
removed or edited.

Rejected (D28): approving at first load, which interrupts a running turn; no approval, which lets any text
from the internet steer a bot that holds signed-in sites; and no Community skills at all.

### `$` everywhere

`$` in the web chat composer, the group chat composer, a new task draft and the mobile composer lists the
skills in the addressed bot's index, with a source badge, instead of the provider snapshot. In a group chat it
lists the skills of the bot the message addresses, or the boss's when none is addressed. On send, the server
resolves each `$name` against that index and loads it at the start of the turn, exactly as `load_skill` would.
An unknown `$name` stays plain text. A registry pick is loaded by Isnadi on every provider, so the Claude
`/name` dispatch is not added for it, and the skill is not loaded twice. The slash menu's `/skill:` entries
read the same index. Mobile honours `showSkillsInSlashMenu`, as web does today.

### Standard OpenCode

Standard OpenCode finds skills itself. Isnadi copies the bot's enabled and approved skills into
`<userdata>/opencode/<botId>/` and points OpenCode at that folder through its config. The copies refresh when
the bot's set or a skill's hash changes. The user's own OpenCode config and skill folders are never touched.
Which folder the pinned OpenCode version reads, and how to point it at another, must be checked and written
into [providers.md](./providers.md) before this is built.

### Connector checks

`requires: [exa, browser, email]` in the frontmatter names the connectors a skill needs, using the ids in
[connector-gap-matrix.md](./connector-gap-matrix.md). Unknown ids show as unknown and are not dropped.

- The registry row and the bot's panel show "Needs <connector>" when the environment has no healthy one, with
  the matrix's repair action.
- `load_skill` returns that message instead of the body, so the bot tells you what to connect.
- Health comes from the existing provider and connector health. There is no new probe.

## Contracts

`packages/contracts/src/skills.ts`:

```ts
RegistrySkill {
  id: SkillId; name; description;
  source: "built-in" | "space" | "yours" | "community" | "provider";
  projectId?; providerDriver?;
  sizeTokens; fileCount; contentHash;
  approval: "not-needed" | "approved" | "needs-approval";
  requires: string[];
  usedBy: BotId[]; lastLoadedAt?;
}
```

- RPC `skills.list({ projectId? })`, with a push invalidation when the registry changes.
- Commands `skill.add`, `skill.remove`, `skill.approve`, with the matching events.
- The bot contract gains `skills` and `skillRegistryAccess`. Both decode to empty defaults.

## Clients

- **Web and desktop:** the space Skills tab (3a), Settings › Skills, the bot skills panel (3b), the row menu
  (3c), the Add skill and approval dialogs, and `$` in every composer.
- **Mobile:** the Settings › Skills list, the bot skills sheet, Approve, Remove and Import (no .zip), and `$`
  with `showSkillsInSlashMenu`.
- Shared list and filter logic lives in `packages/client-runtime`.
- **User docs:** each slice updates [the composer guide](../user/composer.md), which today says `$` lists
  the provider's skills, and adds a skills page under `docs/user/`.

## Reverse states

- Add has Remove. Import copies, so Remove never touches the original.
- A skill switched off on a bot can be switched on again. Taking it out of a bot's set leaves it in the
  registry.
- Approve has "Needs approval" when the content changes. Cancelling the approval dialog removes the added files.
- "Use other skills from the registry" can be switched back off.

## What must not change

- Provider-native discovery and the files in `~/.claude`, `~/.codex` and Grok's home. The registry only reads
  them.
- `RoutineSkillAssignment` keeps working. Moving it onto registry ids is out of scope.
- The `.isnadi` data boundary. Nothing is written to `~/.t3`.
- Skills stay out of the portability export, as today.

## Security

Threat: a skill's text becomes instructions for a bot that may hold browser sessions, signed-in sites and the
user's files. The security-architect reviews:

- the `read_skill_file` path guard, and that the index never lists a skill the bot cannot see (TASK-123.6);
- the GitHub fetch and the archive unpacking (TASK-123.7);
- the D28 server gate, before merge (TASK-123.8).

## Testing

- Registry: each source is scanned, precedence picks the right winner, and the hash changes when a byte
  changes.
- Decider and projection: add, remove, approve and the bot's skills fields, including old bots decoding.
- Tools: `load_skill` and `read_skill_file`, with a path guard test for `..`, absolute paths and a symlink
  that leaves the root, the 256 KB cap and the refusal of a skill outside the index.
- The same bot gets the same index on all six Mastra providers: one test switches the engine and compares.
- Archives: each limit and each rejected entry type.
- Approval: unapproved, approved, changed after approval and approved again, each through the index, both
  tools and `$`.
- Standard OpenCode: `client.app.skills()` lists exactly the bot's enabled skills.
- Web and mobile are verified in isolated clients ([verification.md](./verification.md)).

## Slices

Each slice is a board card under TASK-123, in milestone m-15.

| Milestone | Card        | Slice                                                           | After                         |
| --------- | ----------- | --------------------------------------------------------------- | ----------------------------- |
| —         | TASK-123.1  | this spec                                                       | —                             |
| —         | TASK-123.3  | design frames                                                   | —                             |
| 1         | TASK-123.2  | registry service, contract, RPC, web list and Settings › Skills | —                             |
| 1         | TASK-123.4  | mobile Settings › Skills list                                   | .2, .3                        |
| 2         | TASK-123.5  | per-bot skills: fields, migration, panel 3b                     | — (first PR is contract only) |
| 2         | TASK-123.6  | the index, `load_skill` and `read_skill_file`                   | .2, first PR of .5            |
| 3         | TASK-123.7  | Add and remove                                                  | .2, .3                        |
| 3         | TASK-123.8  | D28 approval gate                                               | .3, .6, .7                    |
| 3         | TASK-123.9  | `$` everywhere                                                  | .6                            |
| 4         | TASK-123.10 | standard OpenCode managed folder                                | .5                            |
| 4         | TASK-123.11 | connector checks                                                | .6                            |

## Open questions

- The badge for a skill added to all spaces. The design shows Built in, Space, Community and Provider only.
  The designer decides in TASK-123.3.

[contracts-providers]: ../../packages/contracts/src/server/providers.ts
[claude-skills]: ../../apps/server/src/provider/Drivers/ClaudeSkills.ts
[grok-skills]: ../../apps/server/src/provider/Drivers/GrokSkills.ts
[opencode-runtime]: ../../apps/server/src/provider/opencodeRuntime.ts
[migration-051]: ../../apps/server/src/persistence/Migrations/051_BotDisabledMcpServers.ts
[routines]: ../../packages/contracts/src/routines.ts
[isnadi-tools]: ../../apps/server/src/provider/mastra/IsnadiTools.ts
[isnadi-instructions]: ../../apps/server/src/provider/mastra/IsnadiInstructions.ts
[composer-trigger]: ../../packages/shared/src/composerTrigger.ts
[claude-dispatch]: ../../apps/server/src/provider/Drivers/ClaudeSkillDispatch.ts
