## @isnadi/contracts@0.0.41

## 0.1.0

## 0.0.2

## 0.0.1

## 0.2.1

## 0.2.0

### Minor Changes

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Add authenticated computer observation and takeover contracts for remote bot workspaces.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Adds the remaining typed Isnadi catalog contracts and Mastra handler hooks for web access, image generation, and MCP account lifecycle mutations.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Provider skills now carry an optional per-skill icon. Codex reports the icon paths from its skill interface metadata, Claude reads an `icon` key from SKILL.md frontmatter, and Grok forwards the icon from `grok inspect`. OpenCode reports no icon field and Kimi For Coding has no skill-loading mechanism, so those catalogs stay icon-less by design. Clients fall back to the existing source-kind badge when a skill has no icon.

### Patch Changes

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Keep delegation updates readable by clients using the previous wire format.

- upstream #322 [`630de12`](https://github.com/mohammadchehab/isnadibot/commit/630de12aeb4fe350ec957af323566a31aa85ebad) Thanks [@leoisadev1](https://github.com/leoisadev1)! - Share one placeholder chat title between the server and the clients, so a chat that has not been named yet is hidden consistently instead of each surface matching its own literal.

## 0.1.1

## 0.1.0

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

## @isnadi/contracts@0.0.40

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

## @isnadi/contracts@0.0.39

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

## @isnadi/contracts@0.0.38

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

## @isnadi/contracts@0.0.37

### Changes

- upstream #124 fix(web): prevent duplicate bot panes

## @isnadi/contracts@0.0.36

### Changes

- upstream #114 fix(release): ship desktop apps without CLI
- upstream #115 fix(legal): preserve licenses and correct fork attribution
- upstream #116 feat(marketing): explain unsigned macOS downloads
- upstream #117 fix(release): launch packaged desktop apps before publishing

## @isnadi/contracts@0.0.35

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
