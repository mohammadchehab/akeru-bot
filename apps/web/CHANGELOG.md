## @isnadi/web@0.0.41

## 0.1.0

### Patch Changes

- Updated dependencies []:
  - @isnadi/contracts@0.1.0
  - @isnadi/client-runtime@0.0.7
  - @isnadi/shared@0.0.7

## 0.0.2

### Patch Changes

- Updated dependencies []:
  - @isnadi/contracts@0.0.2
  - @isnadi/client-runtime@0.0.6
  - @isnadi/shared@0.0.6

## 0.0.1

### Minor Changes

- [#13](https://github.com/mohammadchehab/isnadibot/pull/13) [`daaa280`](https://github.com/mohammadchehab/isnadibot/commit/daaa2800ec88c79b659d2a78cec81dc84a3f154e) Thanks [@mohammadchehab](https://github.com/mohammadchehab)! - The product is now IsnadiBot everywhere: the `isnadi` command, `ISNADI_*` environment variables, `~/.isnadi`, and the `isnadi://` desktop scheme. Existing data moves over on first launch, including the server database, the app's stored settings and themes, saved connections, in-app browser sessions, and old chat blocks and archives. The old `AKERU_*` environment variables still work. Product feedback is off until you set your own endpoint.

### Patch Changes

- [`66ba44d`](https://github.com/mohammadchehab/isnadibot/commit/66ba44dfcde1fbb3e63cf27f2afb73001baa26c5) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Use the selected terminal scrollbar colors and keep waiting labels and placeholders static.

- [`66ba44d`](https://github.com/mohammadchehab/isnadibot/commit/66ba44dfcde1fbb3e63cf27f2afb73001baa26c5) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Fix stacked charts and chart fragment children, and restore input focus when clicking an addon icon.

- [`0e8ddb1`](https://github.com/mohammadchehab/isnadibot/commit/0e8ddb1c42106a493299d77a1ac686860d3f71d6) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Buttons next to text fields, such as Connect on the provider sign-in code field, now match the field's height.

- [`66ba44d`](https://github.com/mohammadchehab/isnadibot/commit/66ba44dfcde1fbb3e63cf27f2afb73001baa26c5) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Restore image compression fallbacks when browser APIs are missing, and preserve valid composer model selections when another stored provider selection is malformed.

- [`f6ae162`](https://github.com/mohammadchehab/isnadibot/commit/f6ae1623eb53fcc0fbd5a0f2b0a5d6f0a95bebc0) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Usage now opens as a full page like Plugins, hiding the bot list and using the window width.

- [`66ba44d`](https://github.com/mohammadchehab/isnadibot/commit/66ba44dfcde1fbb3e63cf27f2afb73001baa26c5) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Make markdown alerts, connection status, and quit feedback follow the selected theme colors.

- Updated dependencies []:
  - @isnadi/contracts@0.0.1
  - @isnadi/client-runtime@0.0.5
  - @isnadi/shared@0.0.5

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @isnadi/contracts@0.2.1
  - @isnadi/client-runtime@0.0.4
  - @isnadi/shared@0.0.4

## 0.2.0

### Minor Changes

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Archive a bot from its roster menu and restore it from Archived. An empty roster now shows a Create bot prompt.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - While a bot works, the chat shows a small pixel meter with the current step and elapsed time. You can change a bot's model from the composer, and routine runs appear as notes in the bot's chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Type `@` in the composer to mention the preview browser or another chat. A chat mention gives the bot a short excerpt of that chat's recent turns, and `@browser` asks the bot to use the preview browser when bot browser access is on. Bots that share a name both appear in the menu, and picking one routes the message to that bot.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Hold the microphone in an empty chat composer to dictate a message on web, desktop, and mobile. Isnadi transcribes through the environment's voice provider and inserts the text at the cursor without sending it.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Memory now lists durable facts by chat, bot, or project scope, with their source, approval state, and replaced value, on desktop, web, and mobile. Durable facts can be exported per scope, and importing them asks you to choose a version for each conflict before anything changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add Image generation settings with separate ChatGPT and Grok rows, honest health tests, a default provider and fallback order, and a per-bot image provider choice. Mobile shows the saved setup.

- upstream #296 [`268ea1a`](https://github.com/mohammadchehab/isnadibot/commit/268ea1a3feb0f6713b3dfde8e6b4e72242e77877) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Bot avatars are now flat shapes in a brighter palette, with slanted eyes cut out of the body. Bots on an older preset color move to the matching new one. A working bot sways, glances down at its work, and turns its face around its body now and then. Pointing at a bot widens its eyes and makes them follow the pointer. Resting bots stay still apart from an occasional blink or glance, and all motion respects your reduced-motion setting. Dithered avatars are gone: the picker no longer offers generated identicons or a dither filter, and bots that had one now show a shape.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Desktop setup now asks what you want your bot to help with and shows a short plan based on your answer. The last step drafts your first message from that plan. After you send it, setup waits until your bot has started, plays a short one-time celebration, and opens the chat with your message already there. With reduced motion turned on, the plan appears right away and the celebration is skipped.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Settings > Providers now says which subscription or key unlocks each provider, whether that subscription includes API access, the limits each provider publishes, what this environment has saved, and one next step. A provider shows Ready only after a request to it succeeds. Mobile Settings shows the same information, in English and Simplified Chinese.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Routines open into a detail view with their schedule, latest run, instructions, and workspace. A bot's shared browser capture expands with Open and collapses with Esc.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The `$` skill menu shows each skill's own emoji, falling back to the glyph for where the skill came from. Selected skills appear as a larger tinted chip with the same emoji, in the composer and in sent messages, and still send as `$name`. The mobile command menu shows the emoji too.

### Patch Changes

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep group chat send available when a configured member can reply.

- upstream #291 [`5ff172b`](https://github.com/mohammadchehab/isnadibot/commit/5ff172b8d6ed1c67d4d75988860e122a58289282) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep independent chats responsive during provider setup and workspace refreshes, and avoid repeated work during streaming updates.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Checklists with two or more tasks in chat now show a static progress summary, such as "2 of 3 done".

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Diff and patch code blocks in chat now render as change cards with added and removed lines tinted and a count of changed lines.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Streaming answers in chat no longer flash a half-typed code fence, table, list marker, or heading underline. The partial line appears once it can render the way the finished message will.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show the voice connection settings labels in English and Chinese without a missing-translation error.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Allow specialist mentions without a boss and exclude disabled providers from group send availability.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The command palette lists bots first and keeps chats and projects above commands when you search, so a matching chat is no longer buried under commands.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show mobile remote health controls in English and Chinese without missing labels.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep file locations and their explanations visible in bot failure messages.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep routine notes current in an open chat and show the speaker after each note.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Queue group chat follow-ups while the first message is being accepted, preserving one conversation.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The Plugins directory shows listed integrations while verification is pending, with their connection status visible.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - In a group chat, an @mention of a name that two bots share no longer picks one of them at random. The composer explains the clash and holds the message until one bot is renamed.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The group sidebar now reads a removal hint only on the remove buttons it explains, suggests creating a bot when every bot is already in the group, and shows that state as a note under Add bot instead of in the picker.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Hosted pairing links only pair when the token is in the link's fragment. A link that sends the token in the query string is refused.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A hosted pairing link that names the address serving the page now signs in to that address, so **Open app** opens the app instead of asking to pair again.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The hosted pairing page reads the link again when the complete link is opened in the same tab, instead of still saying it is incomplete.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Image generation settings now show loading and unavailable states with a retry instead of an empty history, and Connect opens the right provider sign-in for the same environment. Mobile shows the same provider details as desktop, and the bot editor marks image providers that are off or not connected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a newly created bot's pending chat until it appears in the environment roster.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep delegated child work from replacing a bot or group's latest chat.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Refresh open chat date and time labels after the device timezone changes.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Report terminal paint latency for the latest unkeyed arrival when earlier output was overwritten.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Allow group chats to use a configured bot or project provider when the app default is empty.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The command palette finds each group's current chat in one pass, so opening it stays fast with a long group chat history.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Command palette chat search lists chats you can open before chats from another environment, so those never push an openable chat out of the results.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The command palette's search box now says it searches commands and chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Command palette chat results from another environment show their bot or group name, read from that environment's roster.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Command palette results always match what you typed, so pressing Enter right after typing no longer runs a result from the previous search.

- upstream #300 [`72865f7`](https://github.com/mohammadchehab/isnadibot/commit/72865f7b06c8737ad32e52e215bcac5a6a3a8d43) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Smoother streaming in chats: bot replies update the conversation once per batch instead of once per token, and typing a message no longer re-renders the whole chat.

- upstream #299 [`5ae2952`](https://github.com/mohammadchehab/isnadibot/commit/5ae2952e4ee70f753863dda1f8fb0783a978f20b) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Smoother web chats: long conversations stop re-rendering on every update, and working-bot animations use far less GPU.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a bot's saved provider selection unavailable instead of showing a different provider as selected.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Clickable controls now show the pointer cursor everywhere in the app, including checkboxes, radios, labels, tabs, menu items, and file inputs. Disabled controls keep the default cursor.

- upstream #292 [`0693f24`](https://github.com/mohammadchehab/isnadibot/commit/0693f24f28145a5fc7cfe32563c5b9a11f8467a7) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Reposition IsnadiBot's public messaging as an open-source, self-hosted Grok Bot alternative.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Settings > Providers, chat table and code controls, file links, notifications, and the sidebar now translate to Simplified Chinese.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep routine creation and run notes in bot chats after the routine is deleted.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Failed chat requests now show a short explanation and a next step instead of the raw error, with the technical details one click away. The mobile resume card shows the same summary.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep a bot's saved unavailable provider visible in the composer so users can choose a working model.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show deleted routine history as read-only chat notes instead of opening an unrelated Routines panel.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The roster task chip keeps its own shape on a hovered or selected bot row instead of blending into the row background.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Roster previews now read chat markdown the way the chat renders it, so code samples, URLs, and odd characters in a message stay intact in the preview line.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The bot roster now shows the bot's current chat title as a task chip between its name and the timestamp.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The bot roster stays blank until its first snapshot arrives, instead of briefly saying "No bots yet" right after pairing.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep literal image examples inside code spans in long chat previews.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Screen readers no longer hear a doubled period before "Open Routines" on routine receipts.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Dialog backdrops are more opaque and no longer blur the whole window, and selected and disabled states share one color across the app.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Settings chips in chat can now open Bot channels, Browser, Plugins, Sandbox, and Privacy. On mobile, in-app links no longer reach the system browser, and chips without a matching mobile screen open Settings.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Settings groups its sections by task and shows a loading skeleton, the sidebar footer labels its links, Featured plugins show what they do, and the usage table scrolls on narrow windows.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Ignore archived group members when checking provider availability and give a clear mention hint when the boss cannot reply.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Load recent routine notes first and fetch older notes on demand in bot chats.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - A Settings link in chat that Isnadi does not recognize now shows as plain text instead of a link that could open outside the app.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Show new chat, channel, pairing, and settings labels in English and Chinese.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - The sidebar update button now matches the other sidebar icons. Download progress draws inside the icon instead of around the whole button, the "update available" dot is gone, and the button uses the shared control radius.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Explain when an archived new bot can no longer open its first chat, and clear the pending handoff.

- Updated dependencies [[`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad), [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad), [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad), [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad), [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad)]:
  - @isnadi/contracts@0.2.0
  - @isnadi/client-runtime@0.0.3
  - @isnadi/shared@0.0.3

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @isnadi/contracts@0.1.1
  - @isnadi/client-runtime@0.0.2
  - @isnadi/shared@0.0.2

## 0.1.0

### Patch Changes

- Updated dependencies []:
  - @isnadi/contracts@0.1.0
  - @isnadi/client-runtime@0.0.1
  - @isnadi/shared@0.0.1

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

## @isnadi/web@0.0.40

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

## @isnadi/web@0.0.39

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

## @isnadi/web@0.0.38

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

## @isnadi/web@0.0.37

### Changes

- upstream #124 fix(web): prevent duplicate bot panes

## @isnadi/web@0.0.36

### Changes

- upstream #114 fix(release): ship desktop apps without CLI
- upstream #115 fix(legal): preserve licenses and correct fork attribution
- upstream #116 feat(marketing): explain unsigned macOS downloads
- upstream #117 fix(release): launch packaged desktop apps before publishing

## @isnadi/web@0.0.35

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
