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

## Credits

IsnadiBot is a fork of [Akeru Bot](https://github.com/opencoredev/akeru-bot), which is itself a fork
of [T3 Code](https://t3.codes). Thank you to the Akeru Bot and T3 Code maintainers and contributors,
who built nearly all of this.

IsnadiBot is not affiliated with OpenCore, Akeru Bot, T3 Tools, ping.gg, xAI, Anthropic, OpenAI, or
Moonshot AI.

## License

[MIT](./LICENSE). The original copyright notice is kept as the license requires. Third-party terms
are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
