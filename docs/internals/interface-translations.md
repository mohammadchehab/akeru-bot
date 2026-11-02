# Interface translations

Interface language is a client preference, not environment state. A browser profile, an Electron profile, and a mobile installation must be able to choose independently while connected to the same environment. Language changes must never dispatch orchestration commands or rewrite stored content.

## Catalog conventions

The framework-free implementation lives in `packages/client-runtime/src/i18n`. React and React Native adapters own subscriptions and persistence. Device locale resolution is explicit so shared code does not depend on browser or native globals.

English is the source and fallback language. The shipped set is English, Simplified Chinese (`zh-CN`), and, on web and desktop only, Arabic (`ar`). Traditional Chinese and other locales fall back to English. Test-only catalogs do not count as shipped translations. Additional languages load through the same lazy registry.

Use shared messages when the meaning is the same. Translate static interface copy at its rendering boundary. Preserve whole sentences and named interpolation parameters rather than joining translated fragments. Plural messages need an `other` form and should use `Intl.PluralRules`; use the selected locale's `Intl` date and number formatters rather than formatting on the environment server.

Keep routing keys, command IDs, preference values, shortcut chords, and wire enums stable. Localized Settings search and command results must retain English search aliases. Translate accessible names, descriptions, placeholders, dialogs, and empty states along with visible labels.

Catalog validation checks missing and unknown entries and matching interpolation parameters. Partial catalogs fall back to English at runtime. Parameter values are substituted once, never parsed as another template. Do not register or eagerly import unapproved locales. When additional locales are approved, load only the selected catalog and retain English fallback while it loads or if loading fails.

## Content boundary

Never pass these values through translation lookup:

- Stored user or bot messages, instructions, bot names, or conversation titles.
- Source code, filesystem paths, URLs, model names, connector names, or provider output.
- Protocol identifiers, persisted enum values, error tags, and log messages.
- Interface text that becomes user content, such as the onboarding bot brief, reply quotes inserted into the prompt, and feedback drafts. It is sent as a message, so it stays in the source language.

Display translated explanatory error copy by matching a stable error code at the client boundary. Keep raw provider diagnostics intact and separate. Unknown codes need a generic English explanation, not a translation key. Adding translation infrastructure does not make existing raw error displays localized.

Connection failures follow this rule. `EnvironmentConnectionPresentation.errorCode` in `packages/client-runtime/src/connection/presentation.ts` carries the failure reason from the connection state machine (`ConnectionTransientReason` or `ConnectionBlockedReason`). `connectionFailureMessage` maps each code to one catalog sentence, and `translateConnectionStatus` builds the status line from the phase and that sentence. The raw `error` string never goes through translation. Web shows it in the status tooltip's `title`; mobile shows it in the expanded environment row and in the connection notice detail. A new failure code must be added to `connectionFailureMessage`, which the type checker enforces.

## Right-to-left languages

Arabic (`ar`, Modern Standard Arabic) is the first right-to-left interface language. Two rules decide every case. The interface direction follows the interface language. The direction of content (messages, names, titles) follows the content itself, whatever language the interface uses.

### Locale, formatting, and plurals

- One region-free `ar` catalog. Any `ar-*` device locale resolves to it. The catalog id type is derived from `availableLanguages` rather than repeated in `locale.ts`. `ar` is in `availableLanguages` and `catalogRegistry`. Mobile filters right-to-left languages out of its selector and its device locales (`mobileLanguages` in `apps/mobile/src/lib/languagePreferences.ts`) until it restarts into the new layout direction.
- `formattingLocale(locale)` in `formatters.ts` is the only locale every `Intl` formatter receives. For Arabic it adds `-u-nu-latn-ca-gregory`: Western digits and the Gregorian calendar. Without it, `ar-SA` formats Hijri dates with Arabic-Indic digits next to token counts, model ids, and code that use Western digits. The digit choice is a single constant.
- The usage formatters in `packages/shared/src/usageFormat.ts` take the locale as their last argument and default to `en-US`, so a caller that passes nothing renders English as before. Clients pass `formattingLocale(locale)`; on web, `useUsageFormat()` binds them to the interface language. `formatRelativeHourShort` uses `Intl.RelativeTimeFormat` and is web only.
- Mobile relative times (`lib/time.ts` `relativeTime`) follow the interface language. Hermes has no `Intl.RelativeTimeFormat`, so the units come from the catalog (`<1m`, `{count}m`, `{count}h`, `{count}d`, `{time} ago`): a language writes its own unit and Arabic can add every plural category through `#category` entries.
- Arabic uses six plural categories (zero, one, two, few, many, other). A plural's forms are written in English, so a catalog can only translate the English forms and cannot add new categories. A catalog may therefore add category entries keyed `<English other form>#<category>`. `plural` looks up that key first, then falls back to the translated form. Catalog validation rejects a `#` entry whose base is not an English plural `other` form, whose category is not a CLDR plural category, or whose parameters differ from the base form.
- When the interface direction is right-to-left, the translator wraps each interpolated value in first-strong isolate characters (U+2068 … U+2069). An English bot name, a path, or a number inside an Arabic sentence then keeps its own order and does not reorder the punctuation around it. Left-to-right translators add nothing, so English and Simplified Chinese strings are unchanged.

### Direction

- `directionForLocale` returns `rtl` for the base languages `ar`, `fa`, `he`, `ur`, `ps`, `sd`, `ug`, `yi`, `dv`, and `ckb`, and `ltr` for everything else. It uses a fixed list because `Intl.Locale` text info is missing on Hermes and inconsistent across browsers. The translator and the catalog loader snapshot expose the direction of the catalog actually in use, so a failed Arabic load shows English, left to right.
- Mirrored: layout, sidebars, sheets and drawers, chevrons and arrows that mean back, forward, or sideways expansion, horizontal progress, and swipe directions.
- Not mirrored: icons that carry no direction (search, check, clock, media playback) and the operating system's window controls. On macOS the traffic lights stay top-left, and on Windows the title bar overlay and the resize inset stay right. Those insets live as CSS custom properties in `apps/web/src/styles/chrome.css` and are the only physical offsets the interface keeps.
- An _LTR island_ is an element pinned to `dir="ltr"` whatever the interface direction: code blocks and inline code, diffs, the terminal, the file browser and paths, URLs, model ids, shortcut chords, JSON and log views, chart plots (the time axis runs left to right), and font previews. Inputs whose value is a path, URL, command, environment variable, or token are LTR islands too. Translated copy inside an island, such as a chart tooltip, sets `dir` back to the interface direction. A position measured in the browser (a pointer or a bounding box) stays physical, so it is written `left-(--x)` or `left-[var(--x)]`, which the `isnadi/no-physical-direction-utilities` rule allows.

### Chat content

- Every message block (paragraph, list item, heading, quote, table cell) gets `dir="auto"`, and its text aligns to `start`. The direction goes on each block rather than on the whole message because one reply often mixes an Arabic paragraph with an English one. Code stays an LTR island.
- The composer resolves direction per paragraph as the user types, and its placeholder follows the interface direction.
- User content embedded in interface copy (bot and group names in the roster, the chat header, speaker labels, mention chips, conversation titles) is isolated with `dir="auto"` (`<bdi>` on web).
- Mobile native text uses natural direction per paragraph. On iOS that is `baseWritingDirection` and `alignment` set to `.natural` instead of `.left`. On Android it is `TEXT_DIRECTION_FIRST_STRONG` with view-start alignment. Both the markdown module and the native composer editors follow this.

### Web and desktop renderer

- `LanguageProvider` sets `document.documentElement.dir` together with `lang`, before the app shell paints. `index.html` declares `dir="ltr"` for the moment before settings hydrate. Base UI's `DirectionProvider` wraps the app with the same value, so menus, popovers, tabs, sliders, and their arrow keys follow it. Switching between an LTR and an RTL language applies in place, without a reload.
- Spacing, position, alignment, borders, and radii use logical utilities only: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. Raw CSS uses logical properties (`margin-inline-start`, `inset-inline-end`). Physical utilities are a lint error in `apps/web/src`, and `chrome.css` holds the only physical offsets. Transforms (`translate-x`) and directional icons carry an `rtl:` variant. Resize handles and horizontal drags measure their delta in the reading direction. Custom Left and Right arrow-key handlers swap in RTL.
- The desktop native menu, context menus, updater dialogs, and splash stay English and left to right, as listed under Untranslated exceptions. The renderer needs nothing desktop-specific.
- Fonts: Geist has no Arabic glyphs, and browsers fall back per glyph. The font stacks in `appearanceFonts.ts` therefore name system Arabic families after Geist (SF Arabic and Geeza Pro on macOS, Segoe UI on Windows, Noto Sans Arabic on Linux) instead of bundling an Arabic font.

### Mobile

- React Native reads its layout direction once, at startup (`I18nManager.isRTL`). Choosing a language with a different direction asks to restart. On confirmation the app calls `I18nManager.allowRTL(true)` and `I18nManager.forceRTL(rtl)`, then reloads with `Updates.reloadAsync()` (`DevSettings.reload()` in development). At launch, if the stored language and `I18nManager.isRTL` disagree (System default after a device language change, for example), the app forces the direction and reloads once per launch, never in a loop.
- The native projects allow RTL layout (Android `supportsRtl`, plus the Expo app config).
- Styles use start and end (`marginStart`, `paddingEnd`, `start`, `end`, Uniwind `ms-`/`me-`/`ps-`/`pe-`). React Native swaps left and right in RTL by default, but start and end state the intent. `flex-row` mirrors by itself.
- DM Sans has no Arabic glyphs. iOS and Android fall back per glyph to the system Arabic font, so the app bundles none.

### Out of scope

Server-built text, provider output, and the desktop native shell keep their current rules. The interface language never tells a bot which language to answer in. Other RTL languages reuse this mechanism, but each one still needs approval and its own catalog.

## Coverage and release gate

English extraction is incremental. A catalog's existence is not evidence that every route uses it. `coverage.test.ts` snapshots every file that calls the translator, the number of literal messages, and the finite label sources it checks, so a change in coverage shows up in review.

| Interface area                      | Web and desktop renderer                                                         | Native mobile                                         |
| ----------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Language preference and selector    | Client settings, Settings > General                                              | Installation storage, Settings                        |
| Settings                            | Rail, breadcrumb, searchable row titles, General, Providers, Connections pairing | Root screen and subscreens, except those listed below |
| Settings search and command palette | Translated labels plus English search aliases                                    | No command palette; Settings navigation is translated |
| Pairing                             | Pairing route                                                                    | Connections list and new connection screens           |
| Roster and home                     | Roster sidebar, empty roster, new bot and new group dialogs, group details       | Home, chat list, swipe actions, archived chats        |
| Chat                                | Bot and group chat views, landing pages, prompts, delegation cards, composer     | Chat screen, composer, approvals, empty workspace     |
| Chat dates and times                | Date dividers and routine receipt times use the interface locale                 | Message times use the interface locale                |
| Provider availability               | Model pickers, bot engine row, no-provider banner                                | Composer send block, model picker, new chat flow      |
| Bot settings                        | Settings page, details panel, channels and tools sheets, usage, model pickers    | No bot settings screen                                |
| Onboarding and errors               | Desktop onboarding and the root error view                                       | Not applicable                                        |
| Connection errors                   | Stable-code status line; raw detail in tooltip                                   | Stable-code status line; raw detail kept separate     |
| Confirm dialogs and alerts          | Dialog buttons and fallback title; caller messages translated where owned        | Native alerts and the confirm dialog Cancel fallback  |
| Memory                              | Memory sheet, durable facts, transfer and import review, Privacy > Memory        | Memory screen, durable facts, Settings > Memory       |
| Routines                            | Routine panel, routine form, and routine receipts in chat                        | Chat settings routine screen, approvals, and receipts |
| Approved non-English catalogs       | Simplified Chinese (`zh-CN`), Arabic (`ar`)                                      | Simplified Chinese (`zh-CN`)                          |

The coverage test scans every file that imports `useI18n` or `useMobileI18n`, plus a short explicit list of plain modules that translate through a passed-in or module-level translator: `CommandPalette.logic.ts`, `composerProviderMenuItems.ts`, the mobile `app-updates.ts`, the onboarding logic modules, `botInbox.ts`, `durableMemory.ts`, `imageGeneration.ts`, `providerAvailability.ts`, and `errors/threadErrorPresentation.ts` in client-runtime, and `botEngineSelection.ts`, `routineReceipts.ts`, and `SettingsPanels.logic.ts` in the web app. Plural forms passed to `plural` are extracted as messages too. Mobile code outside React uses `translateOutsideReact` from `apps/mobile/src/lib/i18n.tsx`, which follows the mounted language provider.

### Untranslated exceptions

These surfaces render English in every language. Each is a known gap, not a claim of coverage.

- Desktop native shell: the application menu, context menus built in the main process, updater dialogs, and the startup splash (`DesktopApplicationMenu.ts`, `DesktopWindow.ts`, startup assets). Electron's built-in menu roles follow the operating system. Translating them needs a client-local preference bridge into the main process, a menu rebuild on change, and Electron restart verification.
- Web workspace tools: the file browser, code-block diffs, project scripts, and preview panels. Font previews in Settings also render English sample text.
- Web Settings section bodies outside General. Row titles translate everywhere through Settings search, but descriptions, controls, and dialogs in Appearance and the theme editor, Keybindings, Bot channels setup, Voice, Image generation, Browser, Plugins, Sandbox, Privacy (except Memory), Connections access details, Source control and writing style, Errors, Diagnostics, and project settings render English.
- Desktop update tooltips and toasts built in `desktopUpdate.logic.ts` and `providerUpdates.logic.ts`.
- Web roster timestamps and the chat timestamp tooltip format with the browser or host locale, not the interface language (`roster.logic.ts`, `BotRosterSidebar.tsx`, `timestampFormat.ts`).
- Channel origin labels and shared composer mention labels in `packages/client-runtime` and `packages/shared`.
- Mobile screens: chat channels, the composer command popover, files, usage and bot usage, image generation settings, legal documents, and the activity widget.
- Toast titles and descriptions raised from non-component code outside the translated areas, and confirm dialog messages passed by callers in those areas.
- Raw error text from providers, the environment server, git, and the operating system. It is shown as received, next to a translated explanation where a stable code exists.
- Raw provider diagnostics in Settings > Providers and desktop onboarding: command failure messages, login flow errors, a failed API key save reason, and the last failed request message from a provider check. The page shows them as received and falls back to translated copy only when the server sends no message.

Content that is never translated, by design, is listed under Content boundary above. In memory and routine screens that includes fact text, memory documents, the `USER.md`, `MEMORY.md`, and `GROUP.md` file names, routine names and instructions, run summaries, and timezone names.

Shared helpers that build copy outside React, such as the durable memory labels in `packages/client-runtime/src/durableMemory.ts` and the routine schedule and receipt helpers on web, export catalog keys or take an optional translator that defaults to English. Components pass the active translator; tests and non-React callers get English. Durable fact failures return a catalog message chosen from the failure's stable tag, with the raw server detail kept separate and appended as received.

### Bundle cost

Measured with production web builds on 2026-09-23. The startup set is every script and stylesheet `index.html` loads or preloads.

| Build                                | Startup files | Raw bytes | Gzip bytes |
| ------------------------------------ | ------------- | --------- | ---------- |
| Before translations                  | 4             | 4,661,037 | 1,343,601  |
| Phase 1 (settings, pairing, palette) | 5             | 4,690,879 | 1,353,581  |
| Web chat surfaces                    | 10            | 4,764,677 | 1,380,723  |
| Durable memory merged, untranslated  | 10            | 4,785,827 | 1,385,924  |
| Memory and routines translated       | 10            | 4,800,158 | 1,390,185  |
| Delta from before translations       | +6            | +139,121  | +46,584    |
| `zh-CN` catalog, on demand           | separate      | 68,466    | 24,735     |

Translating memory and routines added 14,331 raw and 4,261 gzip bytes to the startup set, almost all of it English catalog entries. The `zh-CN` chunk grew from 59,202 raw and 21,730 gzip bytes. Gzip figures use `gzip -9`.

The first extra startup file is Vite's preload helper, split out by the catalog's dynamic import. The other five are shared chunks (`select`, `useButton`, and three small hooks) that the bundler split out of code already loaded at startup. They add no new startup code. Most of the growth is the English catalog in the entry chunk, because English is the source and fallback. The `zh-CN` chunk loads only when that language is selected or resolved from the device.

### Verification still owed

Verify every translated route in Simplified Chinese and in English. Exercise switching back, reset to system, restart and reconnect, two clients with different languages, unsupported locales, missing messages, connection errors, long strings, narrow layouts, CJK text, and large native text sizes. Browser screenshots alone do not prove these behaviors; native mobile and Electron need their own integrated checks.

For a right-to-left language, also verify on web, desktop, iOS, and Android: the mirrored layout, switching between LTR and RTL in both directions (in place on web, through the restart on mobile), a message that mixes Arabic and English paragraphs, code and paths staying left to right, Arabic typed in the composer, an English name inside an Arabic sentence, and the macOS and Windows title bar controls staying where the operating system puts them.
