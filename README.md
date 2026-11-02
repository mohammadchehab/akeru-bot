<p align="center">
  <img src=".github/assets/isnadibot-mark.svg" width="112" height="112" alt="IsnadiBot logo">
</p>

<h1 align="center">IsnadiBot</h1>

<p align="center"><strong>The open-source Grok Bot.</strong></p>
<p align="center">
  Named AI teammates that run on <em>your</em> machine, use <em>your</em> subscriptions, and keep <em>your</em> data.
</p>
<p align="center"><em>Bots with memory · Group chats · Their own computer · Telegram, Slack, WhatsApp & more · Desktop, web & mobile</em></p>
<p align="center"><sub>Built on an MIT-licensed project by <a href="https://github.com/opencoredev">OpenCore</a>, which grew out of <a href="https://t3.codes">T3 Code</a>.</sub></p>

<p align="center">
  <strong>English</strong> ·
  <a href="./README.ar.md">العربية</a>
</p>

<p align="center">
  <a href="https://github.com/mohammadchehab/isnadibot/actions/workflows/ci.yml?query=branch%3Amain"><img src="https://github.com/mohammadchehab/isnadibot/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="Build status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/mohammadchehab/isnadibot/stargazers"><img src="https://img.shields.io/github/stars/mohammadchehab/isnadibot?style=social" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Web%20%7C%20iOS-lightgrey" alt="Platforms">
  <img src="https://img.shields.io/badge/local--first-no%20hosted%20account-10b981" alt="Local-first">
  <img src="https://img.shields.io/badge/models-Claude%20·%20ChatGPT%20·%20Grok%20·%20Kimi-8b5cf6" alt="Models">
  <a href="ROADMAP.md"><img src="https://img.shields.io/badge/collaborators-wanted-f97316" alt="Collaborators wanted"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-isnadibot-vs-hosted-ai-teammates">Why IsnadiBot</a> ·
  <a href="docs/user">Docs</a> ·
  <a href="ROADMAP.md">Roadmap</a>
</p>

<p align="center">
  <img src=".github/assets/hero.png" alt="IsnadiBot on desktop and iPhone: the Chief bot explains what it can do" width="100%">
</p>

---

> [!NOTE]
> Hosted AI teammates are great until you notice where they live: on someone else's computer, running
> someone else's models, holding your files and logins. **IsnadiBot is the same idea, open source.**
> Your bots run in an environment you own (your laptop, your server, or a sandbox you pick), and they
> work through the Claude, ChatGPT, Grok, or Kimi subscription you already pay for. There's no
> IsnadiBot account and no IsnadiBot cloud.
>
> IsnadiBot started as a fork of an MIT-licensed project by [OpenCore](https://github.com/opencoredev)
> and keeps its full history. See [Credits](#-credits).

---

## ✨ Highlights

- 🤖 **Bots with a name and a memory.** Each bot has its own instructions, engine, tools, and notes
  it carries into future chats. You can read and edit everything it remembers.
- 👥 **Group chats that actually collaborate.** Put several bots in one chat. The group's boss
  answers by default; `@mention` a bot to hand it the floor.
- 🖥️ **A computer of their own.** Give a bot a sandbox desktop with a browser. Watch its screen
  live, take over to sign in or solve a check, then hand control back.
- 📲 **Reachable where you already are.** Connect a bot to Telegram, Slack, Discord, WhatsApp, or
  iMessage. Messages land in the bot's normal conversation, with the same tools and permissions.
- 🔑 **Bring your own subscription.** Claude, ChatGPT (Codex), Grok, Kimi For Coding, and OpenCode
  run through the built-in runtime. Mix them freely: a Claude bot can generate images with ChatGPT.
- 🔐 **Local-first, for real.** Chats, bots, secrets, and logs stay on your machine. Remote access
  goes over your LAN, SSH, or Tailscale. Nothing proxies through a hosted service.

---

## 🆚 IsnadiBot vs. hosted AI teammates

|                           | **IsnadiBot**                                       | **Hosted (e.g. Grok Bot)** |
| ------------------------- | --------------------------------------------------- | -------------------------- |
| Source code               | ✅ Open source, MIT                                 | ❌ Closed                  |
| Where your bots run       | Your machine, your server, or a sandbox you choose  | The vendor's cloud         |
| Models                    | Claude, ChatGPT, Grok, Kimi, OpenCode, mixed freely | The vendor's own models    |
| Your files, chats, logins | Stay in your environment                            | Stored with the vendor     |
| Account required          | None                                                | Vendor account             |
| Fork it, extend it        | ✅ Plugins, MCP servers, or the code itself         | ❌                         |

---

## 🛠️ Features

### 1. Bots & memory

- **Guided setup.** Connect a subscription, say in a sentence what you want help with, and the bot
  proposes a short plan for where it will start. → [bots](docs/user/bots.md)
- **Two kinds of memory.** Chat memory follows the conversation you're in; long-term notes carry
  what the bot learned about you, its work, and its groups. → [memory](docs/user/memory.md)
- **Permission modes per chat.** Decide which actions a bot can take before it has to ask, from
  auto review to fully hands-off. → [permission modes](docs/user/permission-modes.md)

### 2. Group chats

- **A team in one thread.** Several bots, one conversation, one boss that answers by default.
- **`@mention` routing.** Type `@` and a bot's name to ask that bot instead. → [chats](docs/user/chats.md)
- **Silence watchdog.** If a provider goes quiet for 90 seconds, the chat tells you and drops an item
  in your inbox instead of spinning forever. → [silence watchdog](docs/user/silence-watchdog.md)

### 3. Sandboxes & computer use

- **Pick where work happens.** Local workspaces need no setup. Or connect E2B, Daytona, Vercel
  Sandbox, Upstash Box, Tenki, Railway, or Ascii Box. → [sandboxes](docs/user/sandboxes.md)
- **Watch and drive the bot's desktop.** A bot in a Daytona sandbox gets a desktop with a browser you
  can watch live and take over. → [computer](docs/user/computer.md)

### 4. Channels, voice & images

- **Messaging channels.** Give one bot a line on Telegram, Slack, Discord, WhatsApp, or iMessage.
  On Slack and Discord it reacts to show it's on it, waiting on you, or done. → [channels](docs/user/channels.md)
- **Voice calls.** Call a bot from its chat in the web or desktop app: realtime with your ChatGPT
  subscription or the OpenAI API, or transcribe → reply → speak. → [voice](docs/user/voice.md)
- **Image generation.** Bots create images with the ChatGPT or Grok subscription you connected,
  whatever model they chat with. → [image generation](docs/user/image-generation.md)

### 5. Plugins & tools

- **Curated MCP plugin directory.** Browse, filter, and inspect each plugin's publisher, auth, and
  where it executes before you install it. → [plugins](docs/user/plugins.md)

### 6. Everywhere you are

- **Desktop, web, and iPhone.** Every client talks to the same environment over one authenticated
  WebSocket connection.
- **Remote access without a middleman.** LAN, SSH, or Tailscale, from a browser or your phone.
  → [remote access](docs/user/remote-access.md)
- **Usage at a glance.** Plan limits and recent model activity across all your subscriptions.
  → [usage](docs/user/usage.md)

---

## 🚀 Quick start

### Download the app

Get the latest release from
[github.com/mohammadchehab/isnadibot/releases/latest](https://github.com/mohammadchehab/isnadibot/releases/latest):

| System                | File                               | First launch                                                                                                                                                          |
| --------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS (Apple Silicon) | `IsnadiBot-<version>-arm64.dmg`    | Not signed yet. Open it once, then go to **System Settings → Privacy & Security → Open Anyway**, or run `xattr -dr com.apple.quarantine /Applications/IsnadiBot.app`. |
| Windows (x64)         | `IsnadiBot-<version>-x64.exe`      | Not signed yet. On the SmartScreen screen choose **More info**, then **Run anyway**.                                                                                  |
| Linux (x64)           | `IsnadiBot-<version>-x64.AppImage` | `chmod +x` the file, then run it.                                                                                                                                     |

To run IsnadiBot on a server instead, use `install-remote.sh` (macOS and Linux) or
`install-remote.ps1` (Windows), both attached to the release. See
[remote access](docs/user/remote-access.md).

### Build from source

You need Node.js `^24.13.1` and [Vite+](https://vite.plus):

```bash
git clone https://github.com/mohammadchehab/isnadibot.git
cd isnadibot
curl -fsSL https://vite.plus | bash
vp i
vp run dev
```

### 🍎 macOS app (Apple Silicon)

Install Rust, then:

```bash
pnpm dist:desktop:dmg:arm64
```

The disk image is written to `release/`.

### 📱 iOS app

IsnadiBot for iPhone and iPad is a client for your environment. Your bots keep running on your
computer or server; the phone lets you chat with them, check on their work, and manage settings from
anywhere. It isn't on the App Store yet.

You need a Mac with Xcode and an Apple developer account (the app uses native modules, so Expo Go
won't work). From `apps/mobile`:

```bash
vp run dev:client   # start Metro
vp run ios:dev      # build and run the dev client, installed as "IsnadiBot Dev"
vp run ios:release  # or build a self-contained release app, installed as "IsnadiBot"
```

<details>
<summary>Free Apple account, and pairing your phone</summary>

With a free Apple account (Personal Team), set `T3CODE_IOS_PERSONAL_TEAM=1` and a bundle ID you own
in `T3CODE_IOS_PERSONAL_TEAM_BUNDLE_ID`. That build leaves out the widgets, the share extension,
push notifications, and Sign in with Apple.

To connect the app, run `isnadi pair` on the machine running IsnadiBot and scan the QR code it
prints. Pairing over your local network or Tailscale works the same way; see
[remote access](docs/user/remote-access.md) and the [mobile README](apps/mobile/README.md).

</details>

### 📂 Where your data lives

Chats, bots, settings, secrets, and logs stay on your machine in `~/.isnadi`. An existing upstream
data folder is moved there on first launch, so your data carries over.

---

## 🧱 Architecture

IsnadiBot is a pnpm monorepo. The environment server does the work, and every client talks to it
over the same authenticated WebSocket connection.

```
  Desktop (Electron) ─┐
  Web (React/Vite)  ──┼──► Environment server ──► Claude · ChatGPT · Grok · Kimi · OpenCode
  iOS (Expo)        ──┘    bots · groups · memory     sandboxes · MCP plugins · channels
```

<details>
<summary>All components</summary>

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

</details>

---

## 🤝 Collaborate

IsnadiBot is looking for collaborators. The [roadmap](ROADMAP.md) lists features that are open to
pick up, from end-to-end tests for group chats to CI, and [CONTRIBUTING.md](CONTRIBUTING.md)
explains how to get started. Comment on an issue, or open one, to claim it.

If IsnadiBot is useful to you, a ⭐ helps other people find it.

---

<p align="center">
  <a href="https://github.com/mohammadchehab/isnadibot/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=mohammadchehab/isnadibot&max=200&columns=12" alt="IsnadiBot contributors">
  </a>
</p>

---

## 👥 Contributors

IsnadiBot started as a fork of OpenCore's fork of T3 Code. Every commit from both projects
is still in this repository, so everyone below helped build it. Thank you.

<p align="center">
  <a href="https://github.com/mohammadchehab/isnadibot/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=mohammadchehab/isnadibot&max=200&columns=12" alt="IsnadiBot contributors">
  </a>
</p>

---

## 🙏 Credits

IsnadiBot is a fork of an MIT-licensed project by [OpenCore](https://github.com/opencoredev), which is
itself a fork of [T3 Code](https://t3.codes). Thank you to the OpenCore and T3 Code maintainers and contributors,
who built nearly all of this.

IsnadiBot is not affiliated with OpenCore, T3 Tools, ping.gg, xAI, Anthropic, OpenAI, or
Moonshot AI. Grok and Grok Bot are trademarks of xAI; they're named here only for comparison.

## 📄 License

[MIT](./LICENSE). The original copyright notice is kept as the license requires. Third-party terms
are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
