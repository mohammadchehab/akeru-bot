<p align="center">
  <img src=".github/assets/isnadibot-mark.svg" width="96" height="96" alt="IsnadiBot logo">
</p>

<h1 align="center">IsnadiBot</h1>

<p align="center">
  Named AI teammates on your own machine. Bring your own Claude, ChatGPT, Grok, or Kimi subscription.
</p>

<!-- Screenshot of the rebranded app goes here once the IsnadiBot rebrand lands. -->

IsnadiBot is a local-first desktop app for working with named bots. Each bot has its own
instructions, tools, and memory. Put several in a group chat and they work together. A desktop app,
a browser client, and a mobile client all connect to the same environment.

IsnadiBot has no hosted account and provides no model access. You connect a subscription you
already have.

## What you can do

- **Bots with their own identity.** Give each bot a name, instructions, an engine, and memory. See
  [bots](docs/user/bots.md) and [memory](docs/user/memory.md).
- **Group chats.** Add several bots to one chat. The group's boss answers by default; type `@` and a
  bot's name to ask that bot instead. See [chats](docs/user/chats.md).
- **Your providers.** Claude, Codex (ChatGPT), Grok, Kimi For Coding, and OpenCode. See
  [providers](docs/user/providers.md).
- **Plugins and channels.** Connect tools, and let bots answer outside the app. See
  [plugins](docs/user/plugins.md) and [channels](docs/user/channels.md).
- **Work from anywhere.** Reach your environment over your local network, SSH, or Tailscale, from
  the browser or your phone. See [remote access](docs/user/remote-access.md).

## Build and run

IsnadiBot doesn't publish releases yet. Build it from source with Node.js `^24.13.1` and
[Vite+](https://vite.plus):

```bash
curl -fsSL https://vite.plus | bash
vp i
vp run dev
```

To build the macOS app (Apple Silicon), install Rust and run:

```bash
pnpm dist:desktop:dmg:arm64
```

The disk image is written to `release/`.

Your chats, bots, settings, secrets, and logs stay on your machine in `~/.akeru`. The folder keeps
its upstream name so data carries over from Akeru Bot.

## iOS app

IsnadiBot for iPhone and iPad is a client for your IsnadiBot environment. Your bots keep running on
your computer or server, and the phone lets you chat with them, check on their work, and manage
settings from anywhere. It isn't on the App Store yet, so build it from source.

You need a Mac with Xcode and an Apple developer account. The app uses native modules, so Expo Go
doesn't work. From `apps/mobile`:

```bash
vp run dev:client   # start Metro
vp run ios:dev      # build and run the dev client, installed as "IsnadiBot Dev"
vp run ios:release  # or build a self-contained release app, installed as "IsnadiBot"
```

With a free Apple account (Personal Team), set `T3CODE_IOS_PERSONAL_TEAM=1` and a bundle ID you own
in `T3CODE_IOS_PERSONAL_TEAM_BUNDLE_ID`. That build leaves out the widgets, the share extension,
push notifications, and Sign in with Apple.

To connect the app to your environment, run `akeru pair` on the machine running IsnadiBot and scan
the QR code it prints. Pairing over your local network or Tailscale works the same way; see
[remote access](docs/user/remote-access.md). The [mobile README](apps/mobile/README.md) covers the
details.

## Components

IsnadiBot is a pnpm monorepo. The environment server does the work, and every client talks to it
over the same authenticated WebSocket connection.

| Component                                                              | What it is                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`apps/server`](apps/server)                                           | The environment server: WebSocket API, event-sourced chat history, bots, groups, provider sessions, and checkpoints. |
| [`apps/web`](apps/web)                                                 | The React and Vite web client, served by the environment server.                                                     |
| [`apps/desktop`](apps/desktop)                                         | The Electron desktop app. It wraps the web client and bundles the server.                                            |
| [`apps/mobile`](apps/mobile)                                           | The React Native (Expo) client for iOS and Android.                                                                  |
| [`packages/contracts`](packages/contracts)                             | Typed schemas for everything that crosses the wire between server and clients.                                       |
| [`packages/client-runtime`](packages/client-runtime)                   | Client logic shared by the web and mobile apps.                                                                      |
| [`packages/shared`](packages/shared)                                   | Shared runtime utilities and the built-in themes.                                                                    |
| [`packages/effect-acp`](packages/effect-acp)                           | An Effect client for the Agent Client Protocol, used to talk to provider agents.                                     |
| [`packages/effect-codex-app-server`](packages/effect-codex-app-server) | An Effect client for the Codex app server.                                                                           |
| [`packages/ssh`](packages/ssh)                                         | SSH configuration, authentication, and commands for reaching remote environments.                                    |
| [`packages/tailscale`](packages/tailscale)                             | Tailscale integration for sharing an environment across your devices.                                                |
| [`native/resource-monitor`](native/resource-monitor)                   | A Rust helper that tracks CPU and memory use of the app and the agent processes it starts.                           |
| [`plugins`](plugins)                                                   | The curated plugin directory: MCP servers bots can use.                                                              |
| [`docs`](docs)                                                         | User guides (`docs/user`), architecture notes (`docs/internals`), and runbooks (`docs/operations`).                  |

## Collaborate

IsnadiBot is looking for collaborators. The [roadmap](ROADMAP.md) lists features that are open to
pick up, and [CONTRIBUTING.md](CONTRIBUTING.md) explains how to get started.

## Credits

IsnadiBot is a fork of [Akeru Bot](https://github.com/opencoredev/akeru-bot), which is itself a fork
of [T3 Code](https://t3.codes). Thank you to the Akeru Bot and T3 Code maintainers and contributors,
who built nearly all of this.

IsnadiBot is not affiliated with OpenCore, Akeru Bot, T3 Tools, ping.gg, xAI, Anthropic, OpenAI, or
Moonshot AI.

## License

[MIT](./LICENSE). The original copyright notice is kept as the license requires. Third-party terms
are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
