# Contributing

## We're looking for collaborators

IsnadiBot is young and actively looking for people to build it with. If you like local-first
software, AI agents, Electron, React, or Effect, there's room for you here, whether you want to fix
one bug or own a whole feature.

Start with the [roadmap](ROADMAP.md). Every item there is open for a collaborator to pick up.

## How to get involved

1. **Pick something.** Choose a roadmap item, or open an issue describing a bug or an idea.
2. **Say hello first.** Comment on the issue, or open one, before you start anything bigger than a
   small fix. We'll agree on the approach so your time isn't wasted.
3. **Build it.** Follow [Build and run](README.md#build-and-run) to get a local environment.
4. **Open a pull request.** We'll review it and work through it with you.

Want to help regularly? Say so in an issue.

### Plugins and providers

New plugins and providers start with a proposal, using the plugin and provider proposal forms:
the [plugin proposal](https://github.com/mohammadchehab/isnadibot/issues/new?template=plugin_proposal.yml)
or the [provider proposal](https://github.com/mohammadchehab/isnadibot/issues/new?template=provider_proposal.yml).
Read the [plugin directory admission rules](plugins/README.md) before you submit a plugin. Open the
pull request once the proposal is accepted.

## Pull requests

- **One concern per PR.** If the description says "also", it's probably two PRs.
- **Explain what changed and why.** The problem in a sentence or two, then how you fixed it.
- **Show UI changes.** Include before/after screenshots, and a short video for motion or timing.
- **Add tests for behavior changes.** Run the tests you touched with `vp test run <files>`, and lint
  them with `vp lint <paths>`.
- **Record a release decision.** Run `pnpm changeset` and write a short user-facing summary (`patch`
  for fixes, `minor` for features, `major` for breaking changes). Use `pnpm changeset --empty` for
  docs, tests, and refactors.
- **Use conventional commit titles**, such as `fix(web): new chats no longer spike CPU`.

[AGENTS.md](AGENTS.md) holds the full engineering rules: architecture, lint, testing, and how to run
dev servers safely. It's written for coding agents, but it's the best map of the codebase for people
too.

## Coding with agents

Most changes here are written with a coding agent, and yours can be too. You're still responsible
for the result. Review the diff, run it, and make sure the tests prove what the PR claims.

## Credit

IsnadiBot builds on [Akeru Bot](https://github.com/opencoredev/akeru-bot) and
[T3 Code](https://t3.codes). Fixes that would help those projects too are worth sending upstream.
