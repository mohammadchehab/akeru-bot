# CI quality gates

> For IsnadiBot maintainers.

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on each ready pull request revision and
on every push to `main`. Draft pull requests do not use a runner. A new revision cancels the older run
for that pull request. Runs on `main` are never cancelled, and each push has its own concurrency group keyed by commit SHA
(a shared group would cancel the one queued run when a newer one arrived), so every merge gets its own
verdict and a broken `main` points at the merge that broke it. Maintainers can also dispatch the workflow manually
for diagnostics. The heavy jobs (desktop and the server shards) run on the ten self-hosted `hetzner` runners
for the repository's own branches, and on GitHub-hosted `ubuntu-24.04` runners for pull requests from forks, so
fork code never runs on our box. The other jobs use GitHub-hosted `ubuntu-24.04` runners, and the issue-label
and PR-size jobs use Tenki Linux runners.

### Hetzner pnpm store

The ten runners share one user (`runner`, home `/opt/actions-runner`) and one persistent pnpm store at
`/opt/pnpm-store`, so a hetzner job links dependencies from disk instead of restoring a cache tarball. The
[install action](../../.github/actions/install/action.yml) selects it with `pnpm_config_store_dir` on
self-hosted runners; GitHub-hosted jobs keep `cache: true`. The box also sets `storeDir: /opt/pnpm-store` in
`/opt/actions-runner/.config/pnpm/config.yaml` for any other pnpm run as that user. pnpm's store is content
addressed and safe for concurrent installs, and it sits on the same filesystem as the runners' `_work`
directories so files hardlink. To rebuild it, create `/opt/pnpm-store` owned by `runner` (mode 775).

Never run `pnpm store prune` while runners are online. A prune deletes files that a running install still
needs, and the install then fails with `ERR_PNPM_ENOENT`. Stop the runners first, or leave the store alone.

CI runs as parallel jobs, so a run takes as long as its slowest job instead of the sum of all steps:

- **Changed files.** Decides whether a pull request changes anything besides `docs/`, `.changeset/`,
  `.github/assets/`, and root Markdown files. Pushes to `main` and dispatches always count as code.
- **Static checks.** Runs the guards on every pull request, docs-only ones included: it rejects
  committed PR assets, external local dependencies, stable-version changes, and a missing changeset
  decision. It also validates the plugin directory and contribution policy and checks formatting, since those read
  `docs/`. Lint and type checks run only for code changes. It installs the committed lockfile once for the job.
- **Desktop build and package tests.** Builds the desktop pipeline, checks the preload output, tests
  shipped desktop and shared packages, and checks release-only configuration. Relay and
  mobile-production packages are excluded.
- **Server tests.** Runs the complete server suite as four parallel shards (`--shard=i/4`), each on its
  own runner. Files inside a shard still run one at a time, because the suite is not safe to run in
  parallel in one process. It excludes
  `orchestrationEngine.integration.test.ts` until the executor stack restores its test adapter and
  stops the fixture from calling OpenAI with a test credential.
- **Resource monitor.** Checks formatting and tests the Rust crate.
- **Repository checks.** A small final job that depends on all the others. It fails when any job fails or
  is cancelled, or when a code change skipped a job it should have run. For a docs-only pull request it
  passes when the heavy jobs were skipped. Branch protection requires only this one status, so adding
  or splitting jobs never changes the ruleset. The three heavy jobs share the setup in
  [`.github/actions/install`](../../.github/actions/install/action.yml).

The repository ruleset requires the `Repository checks` result before a pull request can
merge. Direct pushes to `main` cannot bypass this gate. Release workflows start after the validated
revision lands on `main`; version packaging is separate from pull-request CI. The version workflow
runs `pnpm release:version` and maintains one rolling Version Packages pull request with Git and
`gh`, finding it by its `changeset-release/main` head branch. CI also requires every
ordinary pull request to contain a real or empty changeset, so release intent cannot be lost after
merge. Changesets consumes those files in the version pull request and keeps the four product
package versions synchronized. Only the repository-owned Changesets branch and bot-authored pull
request can bypass the marker check or change those stable versions. Updates to that branch dispatch
CI against the exact pull request head SHA; empty-only changesets do not dispatch a version branch.

[`.github/workflows/mobile-bundle.yml`](../../.github/workflows/mobile-bundle.yml) runs
`expo export --platform ios` when mobile code, shared packages, or the lockfile change, on pull requests and
on `main`. Repository checks exclude `@isnadi/mobile`, so this is the only job that resolves the Metro
graph; a missing import or asset fails it. It is a separate status and is not part of the
`Repository checks` result.

[`.github/workflows/installer-tests.yml`](../../.github/workflows/installer-tests.yml) runs focused
Windows PowerShell 5.1 tests when the Windows installer changes. It checks checksum rejection,
per-invocation temporary files, failure cleanup, and the bootstrap under Restricted execution policy.
Downloads and installer launches use fixtures; this job does not install IsnadiBot.

[`.github/workflows/release-smoke.yml`](../../.github/workflows/release-smoke.yml) is a manual,
non-publishing artifact smoke workflow. It uses a 4-vCPU Tenki runner for Linux and GitHub-hosted
Apple Silicon macOS and Windows runners. It builds a Developer ID signed macOS arm64 app.
Electron-builder notarizes and staples the
app before it packages the DMG. The workflow then submits and staples the DMG as a separate object.
It checks both objects with Apple's verification tools. Windows and Linux artifacts stay unsigned.
The workflow also builds and dry-runs the CLI package. It uploads
desktop artifacts for seven days. It does not create a GitHub release, publish a package, or deploy
a site.

Merging a stable version change to `main` starts
[the stable release workflow](../../.github/workflows/release.yml). A push that changes a watched
manifest without changing the stable version exits successfully before any release build starts.
A manual dispatch for an existing stable tag still fails. A Tenki Linux runner plus GitHub-hosted
Apple Silicon macOS and Windows runners build the advertised desktop targets before the workflow
creates the `vX.Y.Z` tag and GitHub Release. The final job verifies the exact asset names and
`SHA256SUMS`, then starts the next Version Packages update. Version automation waits for the current
stable tag before it prepares another version.
A stable release fails before building when the macOS signing credentials are absent, so an
unsigned DMG can never publish as the latest stable release. Scheduled nightlies and Windows
builds without credentials still produce unsigned artifacts.
Unsigned macOS builds still replace Electron's linker-signed stub with a sealed ad-hoc signature
and fail the release if `codesign --verify` fails or the identifier is not `dev.leodoes.isnadi`.
Complete credentials use the existing Developer ID, notarization, and Azure Trusted Signing paths.

The same workflow runs at minute 17 every three hours for nightly releases. It skips the build when
`main` still points at the commit from the latest successful nightly. Otherwise it builds the same
three desktop targets under a semver prerelease version and creates a GitHub prerelease that cannot
replace the latest stable release. Linux preflight, build, and publication jobs use Tenki; native
macOS and Windows builds remain on the required GitHub-hosted runners.

See the [release smoke runbook](../operations/release.md) for the exact validation path.
