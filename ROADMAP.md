# Roadmap

These are the features we want next. Each one is open for a collaborator. Comment on its issue, or
open one, to claim it, and read [CONTRIBUTING.md](CONTRIBUTING.md) before you start.

## Open for collaborators

### 1. End-to-end tests for group chats

Group chats have broken in ways unit tests didn't catch: bots without an engine picked a provider
that wasn't connected, and the owner was locked out of their own group after a relaunch.

- Server integration tests that run group turns against the existing fake provider harness.
- A dev-only fake provider, so the real app can be driven end to end without a subscription.
- Browser and desktop tests for sending to a group, sending after a relaunch, and `@mention`
  targeting.

**Good fit if you know:** TypeScript, Effect, Playwright.

### 2. CI that runs on every pull request

The inherited CI targets runners this repository doesn't have, so pull requests aren't checked
today.

- Move the checks to GitHub-hosted runners.
- Run the packaged macOS smoke test on pull requests that touch the desktop app. It already catches
  a build that fails to load.

**Good fit if you know:** GitHub Actions.

### 3. Signed macOS releases

The macOS app is built from source and unsigned, so macOS blocks it until the quarantine flag is
removed by hand.

- Code signing and notarization in the release workflow.
- Published downloads on GitHub Releases, so people can install without building.

**Good fit if you know:** Apple code signing, electron-builder.

### 4. Windows and Linux builds

The build scripts target all three platforms, but only macOS has been tried since the fork.

- Build, install, and smoke test IsnadiBot on Windows and Linux, and fix what breaks.

**Good fit if you know:** Electron packaging on Windows or Linux.

### 5. Your own messages after a relaunch

After the desktop app restarts, older messages you sent in a group can show as if someone else sent
them.

- Find why the sender identity changes across launches, and keep your messages attributed to you.

**Good fit if you know:** React, event-sourced data.

## Have another idea?

Open an issue and describe the problem you want to solve. Ideas that fit get added here.
