# isnadibot

## 0.2.1

### Patch Changes

- upstream #341 [`3b141ca`](https://github.com/mohammadchehab/isnadibot/commit/3b141ca6b2f68b982e870e6b57ce1e5a886caa23) Thanks [@leoisadev1](https://github.com/leoisadev1)! - ChatGPT, Claude, and Grok sign-ins no longer require their CLIs to be installed. Chat titles and branch names use the saved Isnadi connection too.

  Existing Codex, Claude, and Grok model selections remain usable, connection status updates immediately after sign-in or sign-out, and generated titles and branch names retain model options and screenshot context. Writing requests have a three-minute deadline and continue with text when a screenshot is unavailable.

## 0.2.0

### Minor Changes

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The server now reads `ISNADI_*` environment variables, with the `T3CODE_*` names kept as fallbacks. The background service is now `isnadibot.service` (systemd) or `dev.leodoes.isnadi.service` (launchd); installing it retires an older Isnadi-installed `t3code.service` unit. Provider requests now identify the app as IsnadiBot.

- upstream #335 [`779d43c`](https://github.com/mohammadchehab/isnadibot/commit/779d43c5d8ff55e7ee24df04b471915aed97868a) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delete a bot from its settings page on web, or from chat settings on mobile. Deleting removes the bot from the roster, detaches its chats, stops its work, channels, and voice call, cancels work it sent or received, and removes its routines and skill assignments. Group chats keep their group and fall back to the boss when the deleted bot was answering. A group boss cannot be deleted until another bot takes over, and a bot cannot be deleted when its removal would leave a group with fewer than two active bots.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot and group chats now offer the `$` skill and `/` command menus. The Errors settings page is now called Bot inbox, the Image generation breadcrumb uses sentence case, a disconnected image provider shows a single status line, and a new bot's routine panel explains that its chat must start before a routine can be added.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Watch a bot's Daytona computer live, take control to click and type for it, return control, or stop it. Open it from the bot panel or when a bot asks you a question. The mobile app shows when a bot's computer is running and points to desktop or web.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The bot side panel on web and desktop lists the bot's recent chats. Select one to open an older chat in place of the newest, or start a new chat from the same list. The roster still shows one row per bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots can create and edit images with your connected ChatGPT or Grok subscription, whatever model they chat with. Images are saved in the chat, count toward the bot's usage, and can be opened, saved, copied, or shown in the file manager. Isnadi asks before sending your images to a fallback provider.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Codex and Kimi For Coding bots can now create images with your enabled image providers, save guidance for an MCP server, and read public web pages safely. Page reads stay pinned to a checked public address and stop at 2 MB. Web search reports that it isn't available yet instead of making up results.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show when a bot channel is connecting, mark it for reconnect as soon as a Discord or iMessage connection drops, and replace messaging-service error text with fixed Isnadi messages so tokens never reach clients or logs. Channel replies now come only from the connected bot, and messages written by other bots no longer start turns.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel replies now show where they came from and whether they were delivered. Web and mobile thread views render the external origin on inbound channel messages and a per-reply delivery state (sending, sent, failed, or unknown) on the bot's answer. When the environment advertises a public origin (`--public-origin` or `T3CODE_PUBLIC_ORIGIN`), external replies end with an "Open in Isnadi" link to the bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Work cards in bot and group chats now sit right after the exchange that started the work and keep that place across reloads. Each card shows elapsed time, tokens, and **Scheduled** or **Retried** labels. The access grant moves behind **Details**, **View work** opens a read-only view of the other bot's chat, and group cards name the bot that asked.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot work that failed or was canceled can be retried once as new work, and a bot can keep work running after the reply that started it stops. Work cards on mobile now offer Let it finish, Cancel, and Try again too. A routine can now hand each run to another bot: pick it under **Done by** in the routine form, and the run settles with that bot's work. Bots that cannot take handed-off work show as unavailable in that list.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add a scoped durable-facts read RPC for memory views.

- upstream #303 [`c7dbad4`](https://github.com/mohammadchehab/isnadibot/commit/c7dbad44a97685562976f184e3601eafeede37c0) Thanks [@usehoplite](https://github.com/apps/usehoplite)! - Add Railway bot workspaces with durable identity reattachment and saved credentials. Railway VMs remain running while idle; previews require a CLI tunnel and automatic bot browser routing is unavailable.

  Deleting a bot leaves its Railway VM running; the Railway guide explains how to retire it.

  Preserve sandbox inheritance when editing bot settings. Keep same-chat turns in order while preparing attachments without blocking other chats.

  Interrupting a chat also cancels turns waiting for attachment preparation, while allowing new turns after the interrupt.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots in a group chat can hand work only to bots in that group. The bot that did the work posts its result in the group when it finishes, unless it left the group while working.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Redesign the bot sidebar, creation dialog, and settings, with per-bot panel state, faster General loading, clearer provider accounts, and separate Sandbox and Browser pages.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add image generation provider settings: ChatGPT and Grok rows backed by the existing subscription credentials, a global enable/default/fallback-order settings block, a real health test, and a nullable per-bot image-provider selection.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add an interface language setting with English and Simplified Chinese. Each browser, desktop installation, and mobile device keeps its own choice, follows the device language by default, and can reset to the system default. Settings search and the command palette find the setting in either language. Connection errors are explained in the selected language while the original diagnostic stays available.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile chats now show delegated work as cards inside the conversation. Each card sits right after the message that started the work, keeps its place across reloads, and collapses with that turn's work log, matching the web chat timeline.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Connect separate subscription accounts to provider instances without replacing the default account.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add scoped durable memory archives with checksummed history and explicit per-record conflict resolutions.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Durable memory facts can now be edited, pinned, moved between private, bot, and project scope, approved or rejected, forgotten, and deleted from web, desktop, and mobile. A new Memory section in settings turns memory on or off, controls private bot memory, and chooses whether facts shared with a project wait for approval.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile can now review one bot's usage. Settings > General > Usage lists the bots in each connected environment, and opening a bot shows its input, output, Observer, and Reflector tokens, its cap, an estimated cost, subscription pool use, and reserved tokens. Measurements a provider did not report read Unavailable instead of zero, partly reported measurements read as a floor, and the estimated cost is labelled as a model-rate estimate rather than subscription spend. The cap is read-only on mobile. The screen points to chat settings, where it can be changed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Manage a bot's routines from mobile chat settings, see a proposed routine's schedule and instructions before approving it, and clear every bot inbox item from mobile.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots no longer wait for work they send to other bots. The bot replies first, the work card updates when the other bot finishes, and the result reaches your bot once, in its next reply.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The command palette on web and desktop searches your chats again. Typing lists chats whose title or messages match under Chats, and selecting one opens it in its bot's view.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show contextual bot activity with an expandable history of real tool actions, clearer reply references, and larger reactions. Give routine, command, and question prompts the same quiet review surface, with distinct schedule and task text for routines and neutral command text. Fix shell approvals when the model includes an empty working directory, and keep the server responsive while interrupted bot work recovers after a restart.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add the self-hosted Isnadi Remote installer, signed release archives for Linux x64, macOS arm64, and Windows x64, diagnostics commands, a Docker deployment with an image health check, and administration helpers that keep state in `ISNADI_HOME` or `~/.isnadi`.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remote pairing is easier on a headless machine. `isnadi pair` prints a QR code on a terminal (turn it off with `--no-qr`), accepts `--public-url` for a tunnel you manage, and `isnadi pair --admin` creates the first admin link until an admin device is paired. A new remote install prints one admin pairing link on first boot, which `isnadi remote logs` now shows. Admins can see remote health, re-run the checks, and repair individual checks from Settings > Connections. The doctor now reports a fresh home as "not created yet" instead of raw file errors, and says that Kimi For Coding and OpenCode Go need no command on the machine.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remove the remaining coding-agent features inherited from T3 Code. The user terminal, the mobile files, Git, and Add Project screens, the GitHub, GitLab, Azure DevOps, and Bitbucket integrations, the `t3.json` project file, project icons, the local/worktree choice for new chats, and plan mode are gone. New chats start in the project checkout, and worktree branch names use the default text generation model. Chats and settings saved by older versions still load: plan-mode chats continue in default mode, and old pairing links and tokens that carry the terminal scope keep working without it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remove the code review and pull request features inherited from T3 Code. Chats no longer offer diff review, review comments, pull request linking, or commit, push, and pull request actions. New pairing links no longer grant the review scope, and older sessions and tokens that carry it keep working.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots can ask to save a fact to shared project, group, or workspace memory. You approve, edit, or reject it from a card in the chat or from the bot inbox on desktop, web, and mobile. Sensitive facts always wait for approval.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots can hand a bounded part of a request to up to three temporary helpers, check on them, send them follow-ups, and stop them. Helpers stop when the request ends and don't appear as separate chats.

- upstream #304 [`017f6e0`](https://github.com/mohammadchehab/isnadibot/commit/017f6e0c6835d87666e63dd37eebb04ed8d6ad45) Thanks [@usehoplite](https://github.com/apps/usehoplite)! - Add Tenki sandboxes with persistent Linux VMs and snapshot-backed pause and resume. Connect a Tenki API key in Sandbox settings to use it for bots. Sandbox browser control is unavailable because Tenki previews are public.

  Preserve persistent workspaces after connector failures and retry idle pauses after readiness failures without racing active acquisitions.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Translate the web bot roster, chats, composer, bot settings, new bot and group dialogs, onboarding, and error view into Simplified Chinese. On mobile, archived chats, the empty workspace screen, swipe actions, and alerts are now translated too.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a bot's model cannot run, Isnadi now keeps the model, marks it unavailable, and turns Send off with the reason and one next step instead of sending a message that never gets a reply. The model list shows signed-out and turned-off providers dimmed with the reason, and connecting a provider unlocks its models without a restart. The same check covers bot settings, new-bot setup, voice calls, and mobile.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice calls can use your own OpenAI API, ElevenLabs, Cartesia, or Fish Audio key. Connect, test, replace, and disconnect keys in Settings > Voice. The new "Transcribe, reply, speak" mode sends what you say to the bot as a chat message and speaks its reply. Provider errors now say whether the key, quota, or network failed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add authenticated voice provider connections with transcription and stored-reply synthesis for supported clients.

- upstream #302 [`14b56b3`](https://github.com/mohammadchehab/isnadibot/commit/14b56b3d9ab03ab6ccb1cbfcc41f12a87b538f47) Thanks [@usehoplite](https://github.com/apps/usehoplite)! - Add Ascii Box sandbox support with persistent VMs, saved workspace reattachment, native snapshot-backed stop and resume, and protected browser access. Configure its API key in Sandbox settings.

- upstream #293 [`1c1dada`](https://github.com/mohammadchehab/isnadibot/commit/1c1dadaa2ec4d7c9b8f76d6807a67094176a66c8) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Replace saved facts with editable, bot-owned memory notes that follow bots across chats. Keep separate notes for each group, review durable preferences periodically, and keep up to 30 complete recent turns within a roughly 64,000-token budget alongside conversation observations.

### Patch Changes

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Retrying a message the server already accepted no longer reports a failure when its provider has since become unavailable.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Preserve legacy connection and mobile settings data while migrating storage keys, including asynchronous web storage and failed cleanup attempts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Usage analytics queued with Cursor counters before an upgrade now deliver instead of blocking every later report.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a bot's provider fails while you answer its question, the chat now shows the provider's error instead of claiming the session restarted.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When an answer to a bot's question fails to send, the question stays open to answer again instead of the chat reporting a restarted session.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed answer to a bot's question now keeps the question open only when the bot can still take the answer. Otherwise the chat closes the question and asks you to send the request again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Cancelling an API key sign-in while it is being saved no longer stores the key.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Restoring a memory archive while Private bot memory is off now restores the other notes and only refuses a changed MEMORY.md.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An archived bot no longer picks up an interrupted request when you tap Resume, and voice you speak in its chat is no longer saved. This applies to direct chats and group chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Archived bots no longer answer messages or voice sent from another device or a queued request. The chat explains that the bot is archived and how to restore it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The selected background policy in advanced Settings now shows in the interface language.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Completed pipe-prefixed prose now appears during streaming instead of waiting for a table delimiter that never arrives.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep reported token usage and consumed balance when a running bot request is cancelled.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Update chat date labels when the local day changes while a chat stays open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Checking out a Bitbucket pull request again keeps local commits on its existing branch.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A message sent right after New chat stays in the new chat, a double click on New chat creates one chat, and an archived group chat is no longer reused for the next message.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show the bot inbox, with failures and memory approvals, at the top of Settings > Advanced.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Typing `$` or `/` in a bot or group chat with no provider connected now opens the menu and says to connect a provider, instead of showing nothing. On mobile, `$` does the same.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot usage no longer asks the server for new numbers every five seconds whether anyone is looking or not. It reads when you open the view, when you come back to the window or bring the app to the foreground, and when you pull to refresh. A hidden tab and a backgrounded app now cost nothing.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Load a bot's subscription usage without waiting for unrelated provider accounts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Handed-off work no longer takes over a bot's row in the sidebar. A bot that has only done work for other bots shows as having no chat yet, and selecting it starts its own chat. **Open chat** in the work view opens that bot's own chat, and chat search no longer lists handed-off work.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated work without a deadline now stops after 4 hours if the other bot never reports back, and its card shows a timeout instead of running forever. A routine review left unanswered for an hour now closes instead of holding the chat open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Image connection checks now use the ChatGPT account endpoint and leave image generation unverified until an image succeeds. Reconnecting clears the previous account's image failure, and archived bots remain available in mobile usage.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Make a newly connected ChatGPT account usable without restarting the server, and show current GPT-6 models with GPT-6 Sol as the default.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Capture ordered terminal key echoes that arrive in one output chunk.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show saved WhatsApp webhook URLs for connected channel bindings in settings.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The shared browser preview reads "Opening page…" while a page loads.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reduce repeated remote browser monitor requests when a sandbox keeps rejecting them.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Report each managed-browser startup failure once.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Track browser failures separately for each workspace and show an active shared-browser failure to bots that join later.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Clear browser failure incidents after a later browser tool succeeds.

- upstream #291 [`5ff172b`](https://github.com/mohammadchehab/isnadibot/commit/5ff172b8d6ed1c67d4d75988860e122a58289282) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep independent chats responsive during provider setup and workspace refreshes, and avoid repeated work during streaming updates.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep every past routine run note visible in its bot chat, including after more than five runs.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A prompt that mentions many missing chats no longer triggers unlimited chat lookups.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep remote MCP sessions reusable when refreshed authentication headers change only casing.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Disconnected channels no longer restart when their project changes, a bot with a detached channel can take a new connection, and a failed channel move restores the previous bot in a live project.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots connected to Slack, Discord, Telegram, iMessage, or WhatsApp now pass on finished work from other bots as plain text in the reply to the sender's next message.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A channel reply keeps its delivery label when the message it answers has not loaded yet.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Open chats now update a channel reply's delivery label as soon as it is sent or fails.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel replies interrupted by a restart no longer stay stuck on Sending, and a reply that already landed keeps its Sent label.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot channels now say why a connection failed, such as "Telegram rejected the bot token.", in the setup form, the connection card, and the chat's Channels section on mobile. A connection that fails to connect keeps its chosen bot, deleting a connection asks for confirmation, Settings remembers the selected service tab, and the iMessage connection type shows its label.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show saved channel failure reasons on mobile, explain how to delete an assigned connection, and document the current WhatsApp webhook URL.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel replies in bot chats keep their delivery label when the inbound message is on an older page.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Moving a disconnected channel to another project no longer reconnects it. It stays disconnected until you reconnect it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A disconnected channel stays disconnected when moving it to another bot fails.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Moving a channel to another project no longer starts a second listener when the old one fails to stop.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep channels on their original project when their listener cannot stop, without starting a duplicate listener.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - If reassigning a channel fails and its old project was deleted, the channel goes back to its previous bot in the project you picked instead of being left unassigned.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reconnecting a disconnected channel starts it in the project the picker shows.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channels whose credentials were rejected now offer to update them, and the repair link opens the right channel in Settings.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Repair links for a bot channel open that channel's own Settings page.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Replacing channel credentials now warns when the old connection could not be removed or restored.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Updating channel credentials no longer loses the new credentials when you close the form or a reconnect attempt fails after the bot was left unassigned.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When replacing channel credentials fails after the old connection was removed, the bot now shows as unassigned with a Reconnect action instead of claiming the old connection is unchanged.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Moving a running channel to the project it already uses no longer restarts it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel replies that fail before posting no longer warn about an unconfirmed delivery, provider rejection text stays out of the app, and an interrupted connection attempt no longer leaves a channel stuck on connecting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel settings let you pick the project for each connection, repair a broken connection in one click, replace its credentials, and confirm before deleting it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot channels now show when a channel is connecting, not live, or blocked, and offer one repair button: connect, reconnect, update credentials, check the channel, or reconnect in another project. Updating credentials keeps the old connection if the new ones fail. The setup form warns who can reach the project before you connect, and conflicts with another bot's account get a plain message.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Disconnected or detached channels no longer start bot turns when their listener fails to shut down.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Finished bot work sent to an external channel no longer shows literal italic or list Markdown.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - ChatGPT image requests no longer send a ChatGPT sign-in to the OpenAI Images API or mark the subscription revoked, and delegated results that cannot be read for a turn are handed back to the next turn.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chat mentions that point to hidden or missing chats no longer crowd out later valid mentions.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chat shortcuts ignore shortcut recording and open dialogs, archive waits while a reply starts, deleting a chat stops if its session cannot stop, unread dots show in the collapsed roster and on bot settings, pins order within their own environment, and the archive page reports a failed refresh.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The Chinese interface now formats roster dates, chat separators and usage numbers in the selected language, translates collapsed chat shelves and mobile sort choices, finds the browser mention by its translated name, and names the action in Chinese confirmation dialogs.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The chat you pick for a bot stays selected after a page refresh, and the side panel's browser and computer tools now follow that same chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Claude skill names inside quotes or multi-line code spans stay literal text instead of running as a skill.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show token-based subscription pools as counts in bot usage.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a bot turn waiting while another routine review remains open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Composed voice calls end as soon as the environment connection drops instead of recording into a disconnected call.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bring back the Composio key, account list, and app search on the Plugins page, so you can connect apps through your own Composio account again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The Composio section in Plugins is available in Simplified Chinese.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Computer control no longer delivers input after control is released, and the graphical browser reconnects after Chromium drops its connection.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A computer input request that times out now hands control back to the bot right away instead of leaving it blocked until the control timer runs out.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The computer viewer and the mobile computer notice now notice a bot computer that starts after the chat is open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Releasing computer control refuses queued clicks and keys right away.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Taking control of a bot computer while it is still starting no longer stops the computer and drops your control.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A slow check for a computer that had not started yet no longer hides the computer after it appears.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Connections removed after the rebrand migration stay removed when an old browser tab kept the previous database open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep acknowledged connector incidents closed until the connector recovers.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A corrupt saved client settings or update-notice entry no longer hides the older saved copy.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Restore a damaged subscription credential file if its replacement cannot be saved.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A second damaged subscription credential file no longer overwrites the backup of the first one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Cancelling a sign-in while IsnadiBot repairs a damaged credential file no longer leaves every provider signed out.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A settings change from another browser tab no longer replaces a setting you changed in this tab a moment later.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Stop offering a custom base URL for the removed Cursor subscription provider; legacy Cursor settings still decode but cannot start an auth flow.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reuse sleeping remote workspaces and destroy them when the environment shuts down.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Saved subscription credentials changed by another process now show up without a restart. If the credential file becomes damaged while IsnadiBot is running, it keeps using the credentials it already loaded and shows a warning in Settings; a file that was damaged at startup shows a reconnect error on every provider. The next sign-in keeps the damaged file as a `.corrupt` backup.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show a retry action in a bot deep link when the first roster snapshot fails.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A delegated bot granted only project, workspace, or group memory can now share facts in those scopes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated chats created before the upgrade now stay nested under their parent chat instead of showing up in chat lists.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated bots granted memory scopes keep their memory tool when their turn starts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated chats keep their parent link after a rebuild with the current delegation record format.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot turn no longer starts without its finished delegated results when they cannot be read or handed back; the results stay pending for the next turn.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated results are handed back to the next reply when the server restarts before a failed turn could return them.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a bot's turn fails to start, finished work from the bots it delegated to is kept for its next turn instead of being dropped.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegation cards now show why blocked work is waiting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated bots stop when their parent turn fails, fast child results are no longer lost, and group bots no longer consume each other's delegated results.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated work that finished stays completed when usage recording or the parent notice fails.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed delegation keeps every line of its reason, such as a list of validation problems, and still hides the server stack trace.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Failed bot work cards and routine receipts no longer show a server stack trace with file paths. They show the one readable line of the error, including for failures saved before this fix.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated work keeps its progress note, blocker reason, acknowledgement, and cancel origin after the app reloads.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A completed delegation must report the same child chat and turn it ran in.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot work that cannot start after it is created now shows as failed with Try again, and a second retry of the same work no longer starts duplicate work.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A delegated result still reaches the chat when recording its usage fails.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The delete group confirmation button now says "Delete group" instead of "Confirm".

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A shared memory request can still be approved or rejected after the bot that asked leaves the group.

- upstream #289 [`cedae46`](https://github.com/mohammadchehab/isnadibot/commit/cedae46081f9aeff6274210b234b66ec0047225e) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix desktop startup when the bundled server loads the plugin catalog from a worktree.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Tidy the bot and group creation dialogs, routines, plugins, and feedback dialogs, with clearer copy.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A quick tap on the mobile mic keeps recording until the next tap, and a failed dictation no longer hides Send when voice goes offline.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A disconnected channel whose project was deleted can be reconnected in another project.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A channel that fails to stop while being disconnected or detached no longer keeps sending messages to its bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Durable facts can now be edited, pinned, moved between scopes, approved or rejected, forgotten, and deleted through a scoped memory RPC. New installs keep memory and private bot memory on, and a fact a bot saves to shared project memory waits for approval before the bot uses it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Durable memory facts keep their source chat when you share them with the project or move them between scopes. Facts with no source chat no longer claim "an unknown chat", and memory imports start from an "Import memory archive" button instead of the browser's file picker.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep concurrent provider logins and credential updates on one shared store.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Stop the first-chat handoff if its bot is archived before the chat opens.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep late cache token counts in bot usage estimates without charging the same tokens twice.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Entity memory now respects the Memory setting for new OpenCode chats, follows bot or project changes on reused sessions, keeps smaller facts when one is too long, and forgets permanently deleted facts from summaries.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Turning off Private bot memory now also keeps bot-private durable facts out of what bots receive.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Credential-store initialization can be cancelled and retried after a stalled read.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A Claude, Grok, or OpenCode turn that finishes saving while the server shuts down is still observed into memory after the next start.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An open fact edit or delete confirmation now closes when Memory turns off, instead of offering a Save that the server rejects.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot's question stays open and its chat keeps waiting when sending your answer fails.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed turn now leaves the chat in its error state instead of showing the bot as ready, and reverting to a checkpoint completes for bots that cannot rewind their own transcript.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Allow chats to retry an expired OAuth access token when the saved login can refresh it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep accepted turn retries idempotent when provider availability changes, check the thread's bot for direct chats, and return actionable provider or usage cap guidance from HTTP dispatch.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bitbucket pull request checkout now refreshes an existing branch in the same repository.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Check provider availability and bot usage caps before starting chats through the HTTP orchestration route.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed chat request offers Send feedback only when the cause is unknown. Rate limits and dropped connections show their own fix instead.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep routine receipt navigation visible, reject archived group bosses on resume, and keep raw error details out of feedback drafts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Refresh existing Bitbucket pull request checkouts safely and reuse legacy pull request worktrees when a newer branch alias has no checkout.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remove the retired Cursor provider from live usage reporting and subscription controls while preserving legacy settings and auth data for migration.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Routine recovery now blocks a run when its chat session ended even if the delegation has not settled yet.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Pairing the first admin device now revokes any other admin pairing links issued before it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Cancelled provider turns now release bot usage reservations, and tool and routine lifecycle entries stay visible in per-bot usage. Web usage meters now match the mobile formatting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Start Windows Remote installations at boot through Task Scheduler with the transactional update launcher.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Forgetting a memory fact now also clears it from observations of chats that have not been opened since the app restarted.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Editing a memory fact no longer slows down as you visit more chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Hide restored chats from the archived chats page when an older archive snapshot is still visible.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a composed voice call correlated with its accepted chat turn when a newer turn arrives.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Release browser voice resources after capture setup errors and ignore stale playback failures.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Desktop onboarding now recovers a pending first chat across older app versions and clears stale handoffs for deleted bots.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a new chat handoff pending across environment switches and delayed roster updates.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Sync bot memory files before replacing them so saved notes survive an unexpected shutdown.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Only WhatsApp can send from a not-live channel binding during tunnel setup.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Discord and iMessage channels now report a failed first connection instead of showing connected, and gateway renewal no longer leaves the old listener running.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - WhatsApp webhooks now check the message's phone number against the selected connection before routing it to a bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep delegated thread parent information available in direct thread queries.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Check the Isnadi service unit in the remote installer and logs command.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Grok model lists no longer bring back stale models from the saved provider status after Grok's model list changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Deleting a group now clears the bot that last answered in its chats, so a detached chat no longer sends later work to a former group member.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A group follow-up sent after switching groups mid-send stays in the same chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A group chat link opened while the bot list failed to load now shows the failure and Try again instead of a blank page.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Group rows in the roster show the member count next to a people icon so it no longer looks like an unread count.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An approved group memory is saved under the bot that asked for it, even if another bot is responding when you approve.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot removed from a group no longer receives that group's shared memory when its membership cannot be rechecked.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Group chats no longer fall back to a bot's private memory when group membership cannot be rechecked.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - In a group, mentioning a bot now offers that bot's `$` skills and `/` commands instead of the boss's.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A group message that mentions a bot with an @bot token now checks that bot's provider and usage cap before sending, instead of the group boss's.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Messages sent to a new group chat stay together in one chat when you switch groups before the first one is accepted.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A group message sent just before switching groups no longer lands in the other group's chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A queued group message stays in the chat it was sent from when a newer chat appears in that group.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep saved models visible when a provider is turned off or removed, with a clear unavailable reason and a way to choose a replacement.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show ChatGPT images as connected only when a ChatGPT account sign-in is available; an OpenAI API key alone is insufficient.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Shutting down no longer loses or corrupts memory writes for chats that finished on Claude, Grok, or OpenCode.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A provider health check no longer brings back an account that was signed out or replaced while the check was running.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Paste from the local clipboard into a controlled computer instead of sending a remote paste shortcut.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Pairing links that name another server with `?host=` work again on web and desktop. Opening one saves that server in the browser instead of trying to pair with the address that served the page, and pasting one into Add environment pairs with the named server.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Creating or updating a bot through the HTTP API now rejects a model its provider does not offer.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Group chats started through the HTTP API now respect the usage cap and provider checks of the boss or mentioned bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show Connecting in the channel overview while its connections are starting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel credential replacement messages are translated.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Rejected image requests and health checks now close the provider response instead of leaving the connection open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Shutting down the server now cancels image requests that are still running.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Image generation stops reading a provider response that grows past the image size limit instead of loading it all into memory.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Turning off image providers now hides the image tool from Codex and Kimi bots in chats that are already open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A resolved connector incident no longer reopens for a failure it was already resolved against.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Searching Installed plugins no longer offers Composio apps that are not connected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Clear the checking state when a connected provider account finishes its health check.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chat titles and branch names from a second Claude, Grok, or OpenCode account now use that account's saved API key.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A tool call interrupted by a server restart no longer makes the bot's cost estimate unavailable.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Grok keeps its last good model list when a model check fails, and a bot's selected model stays visible and marked unavailable instead of silently switching to another model.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - New chats no longer fail with "Provider is unavailable" before the provider's status has been checked.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Invalidate forgotten entity memory across provider turns and observational memory.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - If the selected interface language fails to load, the Language setting now says English is showing and offers Try again, on web, desktop, and mobile.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The language setting uses the same dropdown as the other settings.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep routine controls open after failed saves or deletions, open routine receipts in the bot panel, and reject responses for archived bots.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice calls now speak finished replies even when a newer chat turn has replaced the voice turn.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Claude, Grok, and OpenCode chats read project memory from the current project after the chat moves, instead of the project where the session started.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Handing work to a bot on standard OpenCode now fails with a clear reason instead of starting work that cannot run. The bot's Tools sheet, the group `@` menu on web and mobile, and mobile chat settings show that its provider cannot hand off work.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A local pull request checkout that keeps local commits no longer reports that it is on the pull request head.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Persisted-state migration helpers no longer crash when `window` exists but `localStorage` is unavailable, so modules that migrate legacy `t3code:` keys load cleanly in non-DOM environments.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep Grok's successful CLI model list current, show a bot's removed model as unavailable, and include redacted diagnostic details in feedback drafts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Failed channel credential replacement keeps the saved connection available for recovery.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chats can retry after a temporary provider request or probe failure.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Ready provider instances can start chats even when a shared subscription shows no account.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Persist canceled routine claims as canceled when delegated work stops during startup.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep and bill generated images when a later image request fails, and request only the missing images from the fallback provider.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots now fail before a turn starts when their saved model is no longer advertised by the provider instance, instead of surfacing a mid-turn transport error. The chat work log also shows a "Model rerouted" note when a provider reports answering with a different model than requested.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Make channel runtime lifecycle and keyed channel operations Effect-aware.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep delegated child work threads linked to their parent chat and out of bot chat navigation.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - `isnadi pair` now prints expected errors like an invalid `--public-url` or an already-paired admin as a single message instead of an ERROR line with a stack trace. Remote health formats storage in human-readable units, and a missing optional account link no longer reports as a warning. Settings > Connections now states that a localhost-only server can be reached through Tailscale Serve (`isnadi pair --tailscale`) or a restart with a reachable `--host`.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Require channel connections to name a live project, chosen with a project picker in setup, Settings, and the bot Channels panel. Deleted-project bindings show a choose-another-project repair state that an administrator session can repair from web or desktop, while mobile points back to the host, and a failed project move keeps the channel on its earlier project.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channels: Slack checks the app-level token before connecting and reports when Slack cannot be reached instead of blaming the token, Discord ignores role and @everyone mentions, Slack and Discord show an hourglass reaction while a turn waits for your input, and WhatsApp reports Not live until the server has a public HTTPS origin (`--public-origin`).

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel reply delivery no longer stays on "Sending" forever after a restart or a storage hiccup. On startup, interrupted sends reconcile to "unknown" instead of sending forever, and a post that landed before a storage failure now records "sent".

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Server shutdown gives observational memory work a few seconds to finish instead of hanging on a stuck observation, and unfinished observations carry over to the next start. A failed memory import restore now says whether the original observations were kept.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Removing an MCP server from a bot chat no longer erases MCP settings a bot saved at the same time.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory approvals now check edited facts, can retry a rejection that was interrupted, and drop requests whose chat card could not be posted.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A settled chat moves back to active when a bot asks to save a shared memory, so the approval card is not hidden.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory approvals read naturally in Simplified Chinese, Escape cancels an edit, and the bot inbox marks sensitive facts. Chat error notices, provider messages for chats that do not name their provider, and the Settings dialogs for advanced background activity and archive import are now translated.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Importing a memory archive is refused while Memory is turned off.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Complete memory exports now restore facts that moved between scopes and facts that are still pending or were rejected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory imports reject broken or mislabeled fact histories, forgotten facts can only be deleted, and pending facts moved back to private memory stay visible to their bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory stays off when settings cannot be read, memory imports respect the Memory switch, and clearing chat observations checks the chat first.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A complete memory export that includes facts waiting for approval or rejected facts can now be imported again, and those facts keep their approval state.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Importing a memory archive can no longer replace another bot's private memory history when a conflicting fact shares its ID.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed memory lock setup no longer removes a lock another writer holds.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot memory write that loses its file lock while saving no longer overwrites the newer writer's changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Manage bot memory file locks and review claim heartbeats with scoped Effect resources. Bot memory now recovers from a lock left behind by a crash, and review claim renewal stops when its turn ends.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory facts saved before the length limit stay readable.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots can no longer ask to save shared memory to a scope the chat does not have, which left approval cards that could not be approved.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a bot edits its memory and asks to share a fact it cannot share, it now learns the edit was saved and the share failed, instead of retrying an edit that can no longer match.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mention pickers keep files ahead of unrelated chats for path queries, a bot named browser gets its own mention, and code in sent messages keeps its literal mention text on mobile.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - New chats and group bot turns now check the provider, model, and usage cap they will actually use before starting work.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bundle the Beautiful UI license with the mobile app so every checked-in notice ships.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile shows bot work cards in the chat without expanding the turn's work log, each card appears once, and the cards keep their Let it finish, Cancel, and Try again buttons. The "Waiting on delegated work" line and the provider notice now stack above the composer instead of overlapping the chat. In group chats, replies name the bot that is speaking when the speaker changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile now calls a conversation a chat everywhere, matching the web app and the docs. Empty states, filters, settings, launcher shortcuts, and accessibility labels no longer say "bot session".

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep mobile chat navigation usable after a deep link, show the chat title on older iOS, and hide Git actions until a working directory is available.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The mobile composer no longer reads "Ask Bot" before a chat's bot is known. It shows the caller's placeholder, which keeps the hint that you can run a command, until the bot name loads.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A microphone that fails to start on mobile no longer leaves audio stuck in recording mode.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile dictation keeps recording when the composer expands, and stops cleanly when a running turn takes the send slot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On mobile, the chat list header says chats are syncing even while another environment reconnects, and new chats no longer repeat their title twice.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Opening a chat no longer crashes the Android app with "undefined is not a function". Mobile now sorts and reverses arrays with plain copies instead of the newer `toSorted`/`toReversed` methods the Hermes engine does not provide.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The mobile home screen keeps loading while one environment is still syncing instead of reporting another environment's failed chat list.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The mobile home screen no longer spins forever when the environment connects but its first chat list fails to load. It says the chats could not load and offers Try again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile now shows a bot's uploaded picture instead of a gray shape, matching the web roster. If the picture cannot be decoded, the bot's shape takes over.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On mobile, provider and plugin items in the bot inbox now offer Resolve so you can clear them after fixing the problem.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On iPhone and iPad, the System language setting now uses Simplified Chinese when it is a preferred language after an unsupported one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix the bundled Isnadi license on Android, where Metro would not resolve the extensionless LICENSE file as an asset.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The mobile new-chat project picker no longer shows Add project buttons that led nowhere.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix a mobile startup crash where the reply playback provider read navigation route state before a navigator existed; voice synthesis now resolves the environment from the playback request.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On mobile, the resume card for an interrupted request uses a neutral card instead of error styling.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Try again on the mobile home screen reconnects only the environments that failed, leaving healthy and disconnected ones alone.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On mobile, one environment's voice settings no longer decide reply readout in another environment.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Files, the terminal, git actions, and the inspector are reachable again from a mobile chat. iOS keeps them in the header, and Android collects them behind a workspace control beside the bot's name.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The model picker now says why it is empty, and bot details name the exact model the next turn runs on.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show the failure for the latest chat request when an earlier turn also failed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Wait for computer viewer closure before reopening or taking control, and release stale acquisitions after a reopen.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Use a quieter neutral palette in the light and dark themes, with neutral focus rings and a shared motion scale.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Two quick messages in a new chat no longer replace the title set by the first one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A New chat now opens even when the chat you had opened becomes the newest while it is being created.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Opening another chat while a new chat is still being created now keeps you on the chat you opened, and messages sent there stay there.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Messages sent right after New chat now go to the new chat, the new chat takes its title from the first message, and a late reply in the previous chat no longer hides the new one while it loads.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A new chat stays open after it starts, even when an older chat finishes a reply afterward.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Use newly applied voice settings for mobile reply playback controls.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel startup closes a new transport if the bot lookup fails before commit.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show an expired or revoked subscription in image provider status and offer reconnect before an image request runs.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep mobile reply playback mounted across chat and environment changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Two token refreshes for the same subscription login no longer overwrite each other with an older access token.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A background memory observation that is still running when the server shuts down is no longer run a second time at the same time by the next start.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A dropped memory observation whose first drop notice failed now reports the original failure when the notice is retried.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a background memory observation is dropped, the chat notice is retried if it fails to post instead of being lost.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Background memory observations interrupted by a restart now resume once their lease expires, and a failed drop notice is retried without rerunning the observation.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A slow chat memory observation keeps its claim while it runs, so it is never observed twice.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Dropped memory observations now always report their failure, and an observation left behind by a crashed server runs once its claim expires.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chat memory observations that run from the retry queue now use the same provider account as the chat, so bots on a separate account keep their observations.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Failed memory observations now retry on their own after the backoff, and clearing or restoring a chat's memory discards observations still waiting to retry.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory work left mid-observation by an unexpected shutdown now resumes on its own once the old claim expires, without waiting for another turn or restart.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Scoped durable memory exports now return only the selected partition, and the Memory settings actually gate durable memory: turning Memory off stops facts from being supplied to bots and blocks new writes, and turning Private bot memory off withholds each bot's private notes and facts, prevents new bot-private saves, and still lets you list, forget, or delete the existing ones.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel transfers leave a destination bot's existing channel connected until it is unassigned.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Persist and recover observational-memory work across restarts with a self-versioned durable queue, leased row claims, backoff retry without head-of-line blocking, a user-visible activity when an observation is dropped, and complete provider metering.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Opening an older chat while a new chat is still loading now sends your next message to the chat on screen.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Refresh visible mobile read-aloud controls when voice settings change.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot that asks several questions at once now stays waiting until every question is answered.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An OpenCode bot's question stays open when sending your answer fails, so you can answer it again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Answering an OpenCode question that has already expired now closes it instead of leaving it open.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Stop waiting for answers to questions that OpenCode no longer accepts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Repaint mobile reply controls after new voice settings reach the playback session.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Send stays blocked for a provider whose own configured credential has failed, even when the saved subscription login is only expired.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A pairing link opened while another pairing attempt is running is tried once that attempt fails, instead of being ignored.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A pairing link on an HTTP address whose host omits the scheme now pairs with that page instead of trying HTTPS.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Change the model, the language, or image generation settings from the command palette.

- upstream #297 [`01161ce`](https://github.com/mohammadchehab/isnadibot/commit/01161ce529aaa73bf6d519ea95e5fd0d5a5c9b0a) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Faster chats on busy environments: the server no longer reloads the whole database when a bot session starts or a checkpoint is captured, and it stops re-reading secrets while a bot is replying.

- upstream #298 [`0632aa5`](https://github.com/mohammadchehab/isnadibot/commit/0632aa50fcad4b9f2e0a60a8613131d1b22f4f00) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Less bandwidth on remote connections: bot browser preview frames now go only to the chat that owns them, unchanged thread updates are no longer re-sent, and opening Settings no longer re-probes every provider.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Ignore stale subscription health results after credentials change or a newer check begins.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep provider plan-limit reads cached across usage requests and fall back to the last successful result during short provider failures.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep image provider defaults and fallback order when clients update settings at the same time.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Verify the plugin lifecycle matrix in tests and downgrade the Context.dev, Exa, Firecrawl, Parallel, Hoplite, and Gmail catalog entries to an honest verification-pending state with named blockers until each real connection lifecycle passes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Exported environments now keep each MCP server's bot guidance, and importing restores it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A past rate limit or model error no longer blocks new chat turns after the limit resets or you pick a supported model.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot whose model the provider rejected now stops before starting another failing turn, and switching to a different model still works.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Existing worktrees on the old managed pull request branch name now refresh to the latest fork head.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Closing the cloud browser while a tab is opening no longer leaves a Browserbase session running.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Closing the cloud preview browser no longer leaves behind a tab that was still opening.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix restoring bot memory archives after imported project facts move into private bot memory.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A complete project memory export no longer includes revisions a bot wrote privately before the fact moved into the project.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix importing project memory archives from another bot when a fact's earlier private history is omitted.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Provider pages explain which subscription unlocks each provider, show "Checking access" while a new sign-in is verified, and Image generation links land on the right provider.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Provider account rows, sign-in steps, and the Usage rail button follow the interface language.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Long bot chats no longer keep every finished temporary worker in memory.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The editor picker keeps a saved editor choice from earlier Isnadi installs and moves it to current storage when changed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Send each realtime voice tool call to chat once, even if its event is repeated.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Record managed-browser failures in the bot inbox and resolve them after a successful browser attach. A later failure reopens the incident with its occurrence count preserved. The silence-watchdog-failure kind remains reserved for its deferred producer.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep damaged subscription credential contents out of server warnings and load errors.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Refresh chat date labels after local midnight and when the device clock or timezone changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Update the Executor plugin recipe to connect to an existing authenticated Executor 2 HTTP MCP server and keep its lifecycle status pending until verified.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot waiting on an approval or question no longer keeps the server busy, and its silence deadline restarts once you answer.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix subscription credential side-file cleanup and make memory access refresh part of turn admission.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A channel moved to another project comes back on its old project when the move fails, and a channel whose project was deleted shows that it needs a new project after a restart.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Channel messages keep their waiting reaction until every approval and question is answered, including approvals that arrive without a turn.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Image edits no longer reuse an older picture after a text-only message, partial image results are reported as partial, and a consented retry goes straight to the approved provider.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Generated images that declare an enormous canvas are refused instead of posted to the chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed image post no longer leaves the generated files on disk.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Claude, Grok, and OpenCode bots can use image generation, and stopping a chat cancels its image requests.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remote doctor no longer reports a healthy Windows server as an inactive background service.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A WhatsApp channel without a public address now asks to reconnect when its connection stops.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Browser tools fail fast and retry when a workspace browser drops its connection during setup.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reopening a Daytona computer reuses its running browser instead of starting another one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Delegated chats created before parent links existed stay hidden from chat lists after the projection is rebuilt.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Automatic Isnadi Remote updates work when the install or data path contains spaces.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Dismissing an inbox item no longer hides a memory approval that still needs a decision.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Pending memory approvals stay in the chat after many later activities.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An installed plugin that needs reconnecting while its connector awaits verification can still be disabled.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chats with a saved Cursor title model now fall back to a provider that can write titles and commit messages.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Usage meters refresh right away when a provider is reconnected with a different account.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The collapsed roster marks group chats with unread replies.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep stored read-aloud synthesis chunks on natural text boundaries and stop mobile synthesis promptly after cancellation.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Make native read-aloud decoding Hermes-safe and split long stored replies across bounded speech synthesis requests.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Resolve omitted read-aloud provider and voice settings using the server's OpenAI and Alloy defaults.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Connect web, desktop, and mobile read-aloud playback to authenticated voice synthesis with cancellation.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot work cards show a readable reason when a bot cannot start, such as "Ren could not start: Provider instance 'codex' is disabled in IsnadiBot settings.", instead of an internal error trace. Bot work cards, "Worked for" labels, task durations and the working timer now show an hour or more in hours, such as "7h 48m".

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Preserve onboarding progress and restore member controls in legacy groups.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Restart Codex and Kimi For Coding sessions after reverting a chat so discarded turns no longer remain in the bot's context.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Background memory work that finishes after a restart, before its chat is reopened, now counts toward the bot's token usage.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Correct bot usage estimates after cache revisions and keep refreshable image accounts connected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The redesigned sidebar, settings pages, bot and group panels, approval prompts, pairing screen, plugins and command palette show Simplified Chinese again when the language is set to 简体中文.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a late OAuth refresh from restoring credentials after logout or replacement.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chats whose saved OAuth login has expired can send again, so the server can refresh the login instead of the Send button staying off.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Opening an older chat from the chat list or command palette no longer replaces a newer reply as the bot's current chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Detect managed-browser exits in remote sandboxes and report them to the bot inbox without waiting for another browser action.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remote doctor checks the real background service on Linux and macOS, probes only HTTPS endpoints, and keeps support bundles private.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Report available Tailscale network endpoints as remotely reachable and show remote health checks in mobile Settings.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Isnadi Remote's installer health check and log command find the renamed isnadibot service, and still find services installed before the rename.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Check the Isnadi service when verifying a remote update, so an unrelated legacy service cannot hide a failed install.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A remote sandbox bot no longer keeps working in an old project folder after its chat loses its project.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remote updates now accept the machine token only from local callers and wait for starting bot turns.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A server update can no longer begin while a new chat is being set up or while a queued turn start is still waiting to commit.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remote updates now wait for chats that are starting a turn, and taking or returning computer control no longer stops the remote viewer.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The Windows Remote updater no longer accepts a replacement release key or release source from command-line flags.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Remove the file browser's "Add to chat" menu item, which could no longer reach a composer and always failed. Drag a file into the composer or use "Copy mention" instead.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When new channel credentials fail, a channel that was disconnected stays disconnected after the old connection is restored.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On web, replies from a secondary environment are no longer read aloud by the primary server.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Worker chats restored after a restart decline tool approvals instead of waiting on a hidden prompt.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A worker chat resumed after a restart keeps the tool access its bot had, instead of gaining the bot's full tool set.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Restoring a memory archive now keeps a moved fact's earlier scopes and source chat, so reimporting the same archive no longer reports a conflict.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chat loads when the browser blocks access to saved storage.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A Cursor sign-in started before the upgrade now reports as expired instead of staying stuck.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Disconnecting an environment while an update reconnect nudge runs now keeps it disconnected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Try again reconnects a saved environment that had stopped trying to connect, on web and mobile alike.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a revert cannot start the rebuilt session, the chat restores its conversation and reopens its previous session instead of being left without one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Group chats on mobile keep their name and speaker labels, the home header shows chat syncing ahead of unrelated errors and stays quiet offline with no environments, and web Settings shows authorized clients only when the server is reachable remotely.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The bot roster no longer sits on Loading bots when the environment is not connected. It says so and offers Try again, which connects.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The roster preview and side panel follow the open chat: a message sent to another chat no longer shows as its preview, an archived chat stops being selected, and a chat that becomes newest after a send stops pinning the bot's view.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The web bot list no longer stays blank when the environment fails to send its first update. It says the bots are loading, or that they could not load, with the reason and Try again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews of long messages no longer show raw Markdown, such as image alt text or link brackets, when the message is shortened.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot previews in the roster never show image alt text or Markdown syntax from a very long message, and one enormous message no longer slows the roster down.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews decode every named HTML entity, such as &copy;, the way the chat shows them.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews show the text of HTML in a message instead of its raw tags.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews of very long messages no longer show image descriptions when an image label contains backticks or its reference definition comes later.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster message previews flatten markdown more faithfully. Asterisks inside code spans and URLs stay literal, an image-only message no longer blanks out an older visible answer, and whitespace-heavy messages flatten without stalling.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews decode HTML entities and no longer show a message from an archived last chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews of very long messages no longer show image descriptions that contain brackets, and they stay quick for messages of any length.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The bot roster shows the unread dot for a reply in any of the bot's chats, not only its newest one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot shows the unread dot when a reply lands in one of its other chats while an older chat stays pinned.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Canceling a routine run no longer overwrites a run that already finished, canceled scheduled work records as canceled, and a routine run that cannot start now shows why instead of looking canceled.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep routine approvals tied to the chat that requested them.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The routine detail view labels its Instructions, and the docs match the Test button.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Routine creation stays unavailable until the bot chat it reports to actually loads.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Routine notes in a bot's chat show a chevron so it is clear they open Routines.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Failed routine notes in a chat are easier to read in dark mode. Their text now meets WCAG AA contrast in every built-in theme.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Routine notes in a bot's chat read as plain sentences, such as "Daily digest" started a run.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A chat keeps showing that it is waiting on you while a routine review is still open or an accepted routine is still being created.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A routine whose bot work stopped because the server restarted no longer stays running. Its run is marked failed with the restart reason, and the routine waits for you to resume it, as after any other failed run.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep scheduled routines running when their zero-token usage note cannot be saved.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Unify chat vocabulary across web and mobile: search, archive, empty states, and the inbox settings section now say "chat" and "Bot inbox" consistently.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Name pull-request worktree branches and temporary worktree branches under `isnadi/` instead of `t3code/`, while still recognizing existing `t3code/` branches.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Regenerating a worktree branch for a thread on a legacy `t3code/<token>` branch no longer produces `isnadi/t3code/...`; a shared `stripWorktreeBranchPrefix` helper removes either app-managed prefix before the new fragment is applied.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Pre-rename `t3code/pr-<n>/<head>` worktree branches are found and reused when preparing a pull request worktree (GitHub and Bitbucket) instead of being orphaned by a fresh `isnadi/pr-*` branch; mobile theme preferences persisted as `t3-code` or `t3-chat` now canonicalize to the Isnadi theme ids on load.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Make web storage migrations loss-free: localStorage legacy keys are removed only after the new write succeeds, and the `t3code:connection-runtime` IndexedDB database is copied store-by-store into `isnadi:connection-runtime` before the old database is retired.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - SQLite persistence spans now report the configured OTLP service name (default `isnadi-server`) instead of `t3-server`, and the Grok/Cursor ACP clientInfo identifies as Isnadi.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Default OTLP service names and the Codex client identity report as `isnadi-server` / `isnadi_desktop` instead of the upstream `t3-server` / `t3code_desktop` names.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Rename the built-in `t3-chat` and mobile `t3-code` theme ids to `isnadi-chat` and `isnadi-classic`, keeping the old ids readable through the legacy alias tables.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Move web browser storage off the `t3code:` key prefix to `isnadi:` keys, reading the legacy keys once and draining them on the next write so theme, drafts, stashes, and panel state survive the rename.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A pairing link that names the address serving the page now pairs when you open the complete link with its token in the same tab. Such a link with the token in the query string is refused as incomplete, like links for other servers.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Scheduled work cards stay where the routine started instead of moving below later replies.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Tapping the send-slot stop button on mobile now cancels a dictation that is still transcribing.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A message sent with an attachment now reaches the chat it was typed in, even if you open another chat while it uploads.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Two admin pairing links redeemed at the same moment no longer both pair as the first admin.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The settings section is now named Privacy and data.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bots can share project facts while Private bot memory is off.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Attribute shared managed-browser inbox incidents to every active bot using the browser resource.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep shared-browser inbox attribution active until the last chat for a bot releases the browser.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Editing a bot or project fact now refreshes that fact in every open chat, not only the chat where you changed it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Read stored replies with the voice selected for composed synthesis.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile no longer uses an array method that Hermes lacks when it trims finished delegations.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep remote browser monitoring failures distinct from process exits.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Refresh mobile read-aloud controls when voice settings change across environments.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Routine approval previews on mobile now show the timezone used for a proposed wall-clock schedule.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A new sign-in code no longer shows "Code copied" before you copy it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A late event from an old turn no longer resets the silent-run watch or clears its inbox item, a stopped session no longer reports silence, and answering one of several open approvals keeps the chat marked as waiting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add silence watchdog status beats and deduplicated inbox incidents for stalled bot chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chats now say "No response from <provider>" when a bot's provider goes quiet for 90 seconds, instead of showing a working indicator. The notice clears when output resumes, each quiet turn gets one inbox item that resolves on its own, and Isnadi no longer stops quiet turns automatically.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reject standalone voice audio requests from a client that does not own the active call.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile now shows a routine's full proposed instructions and procedure before approval.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile preferences no longer restore stale values from a legacy fallback after a successful database save.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The empty bot workspace keeps the shared titlebar while prompting users to create a bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Web now restores missing saved connections and cached state from an older database without replacing records already written in Isnadi.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile now restores saved connections from an older flat record when the old catalog is damaged.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Disable mobile Send when a built-in provider's Isnadi subscription is disconnected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep upstream voice diagnostics out of call error messages.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Failed channel reconnects keep the delivery verification action when a send is uncertain.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Canceling one credential lookup no longer interrupts other callers waiting for the same store.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The mobile chat composer now shows the correct command placeholder in English and Chinese.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Provider logins now get a server-side health check right after they connect, and sign-in codes can be copied with clear feedback and a manual-copy fallback when clipboard access is denied.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep the last successful usage meters across OAuth token refreshes and temporary provider failures while clearing them on account changes or disconnects.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Turning off Voice or changing the voice now stops a reply that is being read aloud, and replies from a secondary environment show why they can't be read.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed answer to a question from an earlier turn no longer leaves the current chat stuck waiting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A server restart no longer resumes another bot's handed-off work in the background after its card has been marked as failed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot work that was still running when the server restarted no longer shows as running forever. Its card now says the server restarted before the work finished and offers Try again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Allow refreshable OAuth access tokens to retry after an old 401 while keeping signed-out providers blocked from starting chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The working meter no longer loops while a bot works. It sweeps once when a turn starts or moves to a new step, then rests, and the elapsed timer counts whole seconds.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep Executor MCP connections available across bot restarts and project MCP settings changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Saved panel and terminal layouts load before the first paint again, and a saved theme or editor choice is no longer undone by an old leftover setting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Image requests now keep the original provider failure when a fallback cannot handle the request.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Subscription logins for xAI and ChatGPT no longer hang when the provider stops responding. Each login and refresh request now fails with a clear message after 30 seconds.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep pending group questions answerable when a provider disconnects and show failed reply rows only for accepted chat turns that failed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Complete scoped durable memory archive enumeration and reject archive records with foreign ownership.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Invalidate durable-memory derived copies whenever memory is inserted or revised, and cover the durable archive RPC authorization path.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Classify OpenCode adapter failures with the same availability categories as other provider drivers.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Carry provider availability categories through mid-turn failures, include subscription health in turn preflight, and clean up claimed uploads when preflight rejects a turn.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reject knowable provider and bot usage failures before turn messages are persisted, and expose structured model availability categories for clients.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Chats now stop before dispatch when their saved Kimi subscription has expired or been revoked, while independently credentialed providers remain available.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Resolved connector incidents no longer reopen for the same failure.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Mobile inbox repair notices now keep their repair actions visible instead of offering a misleading Resolve button.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep obsolete models blocked during temporary provider errors.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add an opt-in terminal latency recorder and live desktop measurement entry point. The recorder matches a printable keypress to the PTY output that echoes the same character within 250 ms and to the frame that renders it, skips keypresses whose echo is ambiguous, reports p50/p95/p99 values, and adds a documented procedure for local, remote, and tunnel collection. Instrumentation is removed from normal terminal hot paths when disabled.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The terminal latency report no longer records a false sample when an escape sequence is split across two writes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A saved Cursor model for titles and commit messages now falls back to a provider that can run.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Choosing a whole theme no longer brings back an old light and dark mix when the browser refuses to remove a legacy setting.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Clearing the light and dark theme mix now stays cleared when an older saved mix cannot be removed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A failed theme change no longer erases an automatic light and dark mix saved by an earlier release.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Theme preference writes no longer fail when cleanup of the legacy theme storage keys is unavailable.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show the current chat title on Android and retry a bot picture when its image path changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep the mobile home menu available while its environment is disconnected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep raw provider errors out of product feedback drafts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Per-bot usage now reports model-priced cost estimates and provider-reported subscription meter percentages when available. Cancelled turns release their reservation without consuming the bot cap.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep Reconnect available when a channel connection fails with unconfirmed delivery, while retaining the warning and provider link.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Tool calls still appear in bot usage history when the start record could not be written.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Tool usage records no longer collide across chats, and a closed remote browser no longer delays server shutdown.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A running tool call no longer holds back part of a bot's token cap from other chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Tool calls cut off by a server restart now stay in the bot's usage history as interrupted instead of disappearing.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Check the selected provider account and effective instance settings before starting a chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Translate memory and routines into Simplified Chinese: the memory sheet, durable facts, memory export and import, memory settings on web and mobile, the routine panel, and routine updates in chat. Saved facts, notes, and routine text stay as written.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Simplified Chinese now covers the Settings rail, breadcrumb, and General settings, the "no provider connected" banner and other provider availability messages, mobile reply readout and provider sign-in errors, and chat dates and times on web and mobile.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A ready provider with an upgrade notice can start chats without being mistaken for a failed sign-in.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Image generation settings now explain that chat image creation is not available yet.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Recognize the Isnadi service during remote installer health checks served from the web app.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Changing the bot for a channel now uses that bot's recent project unless you chose another project.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Release browser thread attribution when a failed browser is invalidated.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An unexpected chat error now asks you to send feedback with the technical details, in plain words.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An environment you disconnect during a server update stays disconnected instead of being reconnected by the update.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Usage still loads when a server reports a retired Cursor subscription connection.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Usage views stop showing plan meters for a provider right after it disconnects.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Open Usage from the places rail, next to Plugins.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Prevent a late cancellation from releasing the next chat turn's reserved usage.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The Usage page keeps showing an environment's usage when that environment still reports Cursor usage from before Cursor was retired.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A replaced plan account no longer shows the previous account's usage meters while its token refreshes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Price cached and cache creation input tokens at their correct model rates in bot usage.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Update Remote servers from checksum-verified release archives instead of downloading runtime packages from npm.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice calls start speaking long replies sooner and no longer read out a reply from a turn that was cut off.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Changing the voice setting no longer lets replies from another environment offer read-aloud.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Composed voice calls now work, Settings > Voice can choose API realtime or composed calls and manage voice API keys, and HTTP-started chats respect a provider instance's own credential.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Disconnecting a voice provider now cancels read-aloud requests that were already using it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice calls resume listening when the bot finishes a turn without a spoken reply.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Long voice calls no longer keep every realtime event id in memory.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reconnecting a voice key that an earlier Test rejected no longer shows the old rejection after a different key was saved in between.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice Settings keeps showing a rejected API key as rejected after a server restart, and a slow Test of a replaced key no longer overwrites the new key's result.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice settings keep showing "Key rejected" after you reopen them, and no longer show another environment's verdict.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A rejected voice API key now shows the same status on every device, and a key replaced from another device no longer shows as rejected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Replacing a voice provider key now reloads the voice list for the new account.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A voice call now speaks its reply even when a newer chat message was sent before the reply finished.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Changing a voice setting no longer stops a reply that is being read aloud, unless the new setting disallows its voice.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Changing voice settings no longer stops a reply that is being read aloud or resets automatic readout.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Voice settings search results now show in English and Simplified Chinese.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - An older voice key Test that finishes after the key was replaced and restored no longer overwrites the newer Test result.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Ignore late failures and recovery signals from a browser that has already been replaced.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Grok now shows a warning when model discovery is incomplete and keeps previously found models available during that probe.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Restore image providers when re-enabled and show the latest health test result.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Composer banners in the dark Isnadi Chat theme use that theme's outline color again. It stopped applying when the theme was renamed from T3 Chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Settings has an Archived chats page again, where you can unarchive or delete archived chats. Links to `/settings/archived`, the command palette, and Settings chips in chat open it, and mobile chips open its archive screen.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The chat actions button in a bot or group chat header is no longer covered by the side panel toggle when the panel is closed or on narrow windows.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bring back chat actions on web and desktop. The open chat's menu can start a new chat, rename it, regenerate its title, pin, mark unread, settle, snooze, wake, archive, and delete it, and the command palette lists the same actions. Unread chats show a dot in the roster. Shortcuts you bind to New chat, Settle chat, Previous bot, and Next bot now work, and the retired New local chat shortcut is hidden.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The command palette's This chat group now offers each Snooze choice with its wake time, and Wake chat only while the chat is snoozed, matching the chat menu.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - When a bot or group cannot reply, the reason now shows as one quiet line under the composer with a **Set up a provider** button, instead of a card above it. The bot panel no longer repeats the warning under its Model row.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster rows keep the bot's name at full width. The line under it shows the last message as plain text, without markdown symbols, and a chat with no messages yet shows its title there.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The bot panel's Routines section lines up with the rows above it. With no routines it shows one short line and a quiet **New routine** row instead of a large empty card.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A bot's first reply now shows an unread dot when it finishes after you left the chat, and a reply that finishes while the window or tab is in the background stays unread until you come back to it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - WebFetch now blocks site-local, NAT64 and 6to4 addresses, ignores environment proxies, and times out stalled DNS lookups.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - WebFetch refuses a DNS answer that is not a valid address.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Group chats enforce the selected bot's usage cap before starting a turn.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Report image account checks separately from image request health and clear a failed check after a successful retry.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - WhatsApp webhooks on the older bot address now only reach the bot for its own phone number, and oversized webhook bodies are refused before parsing.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - WhatsApp messages for a bot are no longer dropped when Meta batches them with messages for another phone number.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep watching remote managed browsers after a monitor command times out.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Estimate bot usage cost from the full ledger and withhold incomplete estimates.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep unsafe approved facts out of provider memory prompts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The Windows installer keeps the signed release checksum when it relaunches with administrator access.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot memory saves no longer fail on Windows when Isnadi flushes the new file to disk.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A Windows remote update checks the new version on the Node it ships with, so a release that needs a newer Node can still install.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A Windows reinstall of Isnadi Remote now restarts the service even when it cannot delete the old runtime copy, and warns about the leftover folder instead.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On Windows, `isnadi remote` commands keep paths that contain spaces intact.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reinstalling Isnadi Remote on Windows keeps the previous runtime until the new one is in place, and uninstall reports a scheduled task it could not remove instead of claiming success.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On Windows, `isnadi remote uninstall` removes the Isnadi Remote task, `isnadi remote rollback` restarts it, and reinstalling always rebuilds the runtime from the verified archive.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - On Windows, an updated remote server runs on the Node version its release ships with, and Task Scheduler restarts the service when it exits with an error.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Uninstalling Isnadi Remote on Windows now tries to remove every scheduled task and lists any that remain, instead of stopping at the first failure.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Windows server updates now check the downloaded archive against the signed release manifest before installing it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep browser failure incidents tied to the browser that failed, and clear them only after a verified browser startup or tool request.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Temporary workers no longer gain a workspace their bot lacks, keep their restrictions after the chat session stops, and a worker stopped early leaves no hidden chat behind.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Stopping a worker answers right away even while its chat is still being created.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Worker chats restored after a restart keep worker limits and cannot start more workers.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Replacing a bot workspace now waits for the old one to be destroyed before starting the new one.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Translate the mobile routine description label and keep interface coverage current.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Avoid duplicate bot usage reads when the mobile usage screen switches to another bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The first-bot empty state reads a little shorter.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Devices set to a non-Chinese language in Singapore or China, such as Malay (Singapore), no longer get the Simplified Chinese interface.

## 0.1.1

## 0.1.0

### Minor Changes

- upstream #276 [`730617d`](https://github.com/mohammadchehab/isnadibot/commit/730617d74a9eca6047950a3f53a41d7a569610d6) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add per-bot personality settings with Chill, Balanced, and Professional styles.

### Patch Changes

- upstream #275 [`554c9c4`](https://github.com/mohammadchehab/isnadibot/commit/554c9c40db6d16985d2658500b7e02c297c9dbe1) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Recover interrupted chats after server restarts and route supported providers through the unified Isnadi agent controller.

### Changes

- upstream #193 fix(marketing): connect Grok discovery pages to setup
- upstream #194 feat(web): add Read aloud for stored bot replies
- upstream #196 fix(marketing): recover downloads from stalled release requests
- upstream #197 perf(server): yield between filtered workspace search pages
- upstream #198 perf(protocol): make raw event retention opt-in
- upstream #201 perf(server): acquire browser attachments only for consuming connectors
- upstream #199 perf(server): index projected thread lookups
- upstream #204 fix(server): prefer origin for project repository identity
- upstream #205 fix(server): bound OpenCode CLI probes and serialize inventory
- upstream #207 fix(server): stop Windows terminal processes when closing
- upstream #211 fix(server): stop Windows terminal polling from spiking CPU
- upstream #219 fix(web): stop highlighter freezes by using Oniguruma WASM
- upstream #234 fix(mcp): allow text-only preview snapshots
- upstream #236 fix(server): bound session listing and keep a full idle window after turns
- upstream #238 fix(web): show bot and group message actions on touch
- upstream #249 fix(server): skip disabled provider instances for text generation fallback
- upstream #250 fix(server): preserve inline provider secrets on redacted saves
- upstream #231 fix(web): copy text over plain HTTP
- upstream #244 fix(server): stop overpricing cached Claude tokens
- upstream #246 perf(web): stop rendering hidden terminals
- upstream #233 fix(web): keep settings inputs focused during IME composition
- upstream #206 perf(server): bound terminal history incrementally
- upstream #255 perf(web): keep chat markdown mounted while text streams
- upstream #230 perf(server): skip full thread loads on projection and ingestion
- upstream #209 fix(codex): keep app-server protocol decode current
- upstream #226 feat(server): report image dimensions with signed asset URLs
- upstream #208 fix(server): isolate remote web session cookies
- upstream #227 perf(client): keep latestTurn and checkpoint refs stable while streaming
- upstream #164 feat(plugins): add local Executor MCP support
- upstream #200 perf(server): share concurrent usage reads and pricing refreshes
- upstream #202 fix(web): keep reply playback hooks stable during chat hydration
- upstream #203 perf(logging): drain bounded asynchronous writes before desktop exit
- upstream #210 fix(server): stop OpenCode child sessions and route their approvals
- upstream #256 fix(web): make desktop onboarding resilient
- upstream #257 fix(providers): hide disconnected providers
- upstream #252 fix(server): auto-reply full-access OpenCode permission asks
- upstream #212 fix(opencode): revert from the first removed assistant message
- upstream #258 feat(web): add custom bot avatar colors
- upstream #213 fix(mobile): preserve drafts after storage read failures
- upstream #214 fix(grok): probe health with initialize and allow in-session model changes
- upstream #224 fix(grok): encode session/cancel as a real notification and interrupt steers
- upstream #228 fix(grok): map Always allow to allow_once when Grok omits allow_always
- upstream #225 fix(grok): discover skills with grok inspect and fail workspace probes loudly
- upstream #220 fix(server): capture complete turn checkpoints after edits finish
- upstream #229 fix(server): keep attachments until commit and allow first-send retry
- upstream #215 fix(ssh): keep managed remote server ownership through stop
- upstream #216 perf(server): bound orchestration replay and slow-client live buffers
- upstream #217 fix(desktop): separate LAN and Tailscale pairing endpoints
- upstream #218 feat(web): complete live roster drag for bots and groups
- upstream #221 fix(editors): open remote projects in Zed
- upstream #222 feat(desktop): complete quit shortcut confirmation modes
- upstream #223 fix(desktop): pin preview CDP debugger across webview teardown
- upstream #232 fix(desktop): isolate preview shortcuts from the host
- upstream #235 fix(desktop): enable context menus in the in-app browser
- upstream #237 fix(claude): derive usage and name login or limit errors
- upstream #239 perf(server): stream static files and cache hashed build assets
- upstream #240 perf(server): drop transient native events from provider logs
- upstream #241 fix(threads): keep completed questions closed across clients
- upstream #242 perf(client): stop replaying terminal buffers on rollover
- upstream #243 feat(web): add provider model bulk visibility toggle
- upstream #245 fix: stop favicon requests for private chat-link hosts
- upstream #247 fix(server): disable executable tools in Claude metadata generation
- upstream #248 perf(web): avoid repeated terminal metadata scans
- upstream #251 perf(server): index OpenCode text by message and drop unused tool parts
- upstream #253 feat(shared): map text generation models by provider identity
- upstream #254 fix(claude): run composer-picked skills as slash commands

## isnadibot@0.0.40

### Changes

- upstream #176 feat(providers): add API key connections with custom endpoints
- upstream #178 fix(server): keep libsql native loader external to the CLI bundle
- upstream #182 fix(desktop): own dev and smoke Electron processes instead of pkill
- upstream #180 feat(scripts): add dev status, worktree setup, UI fixtures, and pairing helpers
- upstream #183 docs(agents): add verification policy and rewrite testing skills
- upstream #184 fix(desktop): stop claiming legacy t3code:// protocol schemes
- upstream #185 fix(release): recover version PR updates from Tegami's boxed errors
- upstream #188 fix(feedback): send product feedback to the deployed Worker
- upstream #191 feat(web): add Isnadi Noir and flatten shared controls
- upstream #189 feat(install): add release-pinned installer scripts
- upstream #192 fix(plugins): renew stale Hoplite OAuth registrations
- upstream #190 feat(channels): connect external conversations to bots

## isnadibot@0.0.39

### Changes

- upstream #141 fix(web): mute routine notices and update actions
- upstream #151 feat(marketing): add feedback.md, versioned metadata API, rate-limit headers
- upstream #153 fix(desktop): recover failed update installs
- upstream #154 fix(release): require signed macOS builds
- upstream #155 fix(desktop): package lazy server dependencies
- upstream #156 fix(mcp): open OAuth authorization requests
- upstream #149 feat(marketing): report page requests to Notra GEO
- upstream #158 ci: migrate Depot workflows to Tenki
- upstream #150 fix(settings): remove obsolete thread controls
- upstream #159 fix(chat): improve bot conversation usability
- upstream #157 feat(plugins): add Composio integrations
- upstream #162 fix(plugins): complete OAuth connections
- upstream #163 feat(marketing): add Grok search pages

## isnadibot@0.0.38

### Changes

- upstream #126 fix(web): replace sidebar footer labels with icons
- upstream #109 docs: update user guides for subscription runtimes
- upstream #127 feat(web): switch bots with number shortcuts
- upstream #129 fix(web): show Grok models during limited probes
- upstream #135 docs: align agent guidance with IsnadiBot
- upstream #138 ci: validate merge queue candidates with Depot
- upstream #139 feat(bots): move model controls to sidebar
- upstream #136 fix(channels): restore settings and delivery
- upstream #140 feat(bots): personalize Isnadi prompts
- upstream #144 ci: run Depot checks on pull requests
- upstream #146 ci: migrate workflows to tenki
- upstream #142 feat(plugins): add Hoplite MCP integration
- upstream #147 fix(brand): use the Isnadi icon in development
- upstream #143 perf(server): reduce streaming and tool update overhead
- upstream #148 perf(ui): replace class merging with cn
- upstream #137 feat(providers): add OpenCode Go support
- upstream #145 feat(web): add first-install bot onboarding
- upstream #123 fix(macos): install unsigned Mac builds from a checksummed GitHub DMG
- upstream #133 feat(approvals): add auto review and bot prompts

## isnadibot@0.0.37

### Changes

- upstream #124 fix(web): prevent duplicate bot panes

## isnadibot@0.0.36

### Changes

- upstream #114 fix(release): ship desktop apps without CLI
- upstream #115 fix(legal): preserve licenses and correct fork attribution
- upstream #116 feat(marketing): explain unsigned macOS downloads
- upstream #117 fix(release): launch packaged desktop apps before publishing

## isnadibot@0.0.35

### Changes

- upstream #11 feat(voice): add local desktop bot calls
- upstream #14 feat(brand): add lowercase Isnadi icon
- upstream #15 fix(usage): stabilize provider logos and labels
- upstream #13 ci: run Isnadi checks on Depot
- upstream #12 fix(voice): make local calls realtime
- upstream #16 perf(runtime): adopt provider-neutral upstream fixes
- upstream #18 feat(feedback): add the product feedback workflow
- upstream #17 feat(bots): add connector health and error inbox
- upstream #19 feat(plugins): load declarative catalog entries
- upstream #20 feat(plugins): ship the curated plugin directory
- upstream #28 test(mobile): cover bot inbox empty and error states
- upstream #21 fix(server): persist Kimi device identity
- upstream #23 feat(settings): add bot workspace and browser sharing
- upstream #22 feat(contracts): define Isnadi memory and usage records
- upstream #25 fix(server): redact browser snapshot data
- upstream #24 feat(server): add durable bot memory storage
- upstream #27 feat(contracts): define approved Isnadi workspace tools
- upstream #32 feat(server): add sandbox browser runtime
- upstream #29 feat(providers): add Kimi For Coding runtime
- upstream #31 feat(server): add bot inbox controls
- upstream #33 feat(web): resolve bot inbox incidents
- upstream #38 feat(mobile): resolve bot inbox incidents
- upstream #36 feat(server): isolate and pool bot workspaces
- upstream #37 fix(memory): preserve storage correctness
- upstream #39 feat(server): run approved Isnadi tools
- upstream #41 feat(server): add governed memory tool handlers
- upstream #40 feat(server): record human handoff incidents
- upstream #35 feat(server): enforce per-bot token usage caps
- upstream #44 fix(memory): preserve pending update governance
- upstream #45 feat(memory): add RPC and shared client state
- upstream #48 feat(server): expose per-bot usage over RPC
- upstream #50 feat(web): show per-bot usage
- upstream #53 feat(portability): restore archives across environments
- upstream #52 feat(memory): wire governed memory tools into Mastra
- upstream #46 feat(web): manage bot memory
- upstream #55 feat(bots): reply before tools with status beats
- upstream #49 feat(memory): observe new thread messages
- upstream #57 chore(contributing): verify plugin proposal policy
- upstream #61 test(server): prove saved provider routing
- upstream #54 feat(app): ask before local agent commands
- upstream #62 fix(server): redact screenshot tool results
- upstream #59 feat(server): track MCP connector health
- upstream #58 fix(plugins): align directory with connector lifecycle
- upstream #60 feat(analytics): send anonymous usage summaries
- upstream #64 feat(server): delegate work between bots
- upstream #67 feat(marketing): rebuild the landing page from the Paper design
- upstream #65 feat(providers): finish native Kimi support
- upstream #66 fix(server): preserve rewritten Mastra replies
- upstream #63 feat(server): add durable remote sandboxes
- upstream #74 feat(server): let bot bosses manage channels
- upstream #69 feat(server): run browsers in remote sandboxes
- upstream #80 feat(server): let bots message the current thread
- upstream #71 fix(web): keep group avatars during search
- upstream #72 fix(web): widen rich bot output
- upstream #73 fix(analytics): report opt-out deletion failures
- upstream #75 feat(server): manage MCP connections from bots
- upstream #76 feat(bots): show sensitive approval cards
- upstream #82 feat(server): let bots install URL plugins
- upstream #56 feat(isnadi): finish sandbox and memory reliability
- upstream #68 feat(plugins): add local Codex computer use
- upstream #85 feat(marketing): add PostHog web analytics
- upstream #84 fix(memory): bind legacy workspace access to original project
- upstream #87 feat(server): let bots update their own profiles
- upstream #77 feat(server): enforce bounded bot delegation
- upstream #91 fix(marketing): improve agent readiness
- upstream #78 feat(web): show and control bot delegations
- upstream #93 fix(marketing): finish agent readiness gaps
- upstream #88 feat(server): add bot plugin controls
- upstream #90 feat(server): add durable bot management tools
- upstream #83 feat(trust): ship privacy and control milestone
- upstream #86 feat(server): add MCP health controls
- upstream #92 feat(release): ship stable direct downloads
- upstream #89 feat(bots): react to visible messages
- upstream #81 feat(settings): connect remote sandbox providers
