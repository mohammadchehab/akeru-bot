# dev-tasks

Shortcuts for the common workspace commands, run with [go-task](https://taskfile.dev)
(`brew install go-task`). Run `task --list` from anywhere in the repo to see them all.

```sh
task dev                      # server + web
task dev:status               # this worktree's dev home, ports, running servers
task check:all                # typecheck, lint, format check
task test -- apps/server      # tests for one package (no argument: every package)
task check:typecheck -- apps/web
task build:dist-desktop -- --platform mac --target dmg --arch arm64
task mobile:ios-dev
```

Anything after `--` is passed through to the underlying command.

## Layout

- `../Taskfile.yml` includes one file per group: `dev.yml`, `build.yml`, `check.yml`,
  `mobile.yml`. Task names are namespaced by group (`check:lint`); `task dev` and `task build` run
  the group's `default` task, and `task test` is a top-level shortcut for `check:test`.
- Each task only calls `scripts/<group>/<name>.sh`. The logic lives in the script, so you can run
  it directly without go-task.
- Every script sources `scripts/lib/common.sh`, which moves to the repo root, switches to Node 24
  through `fnm` when it is installed, and puts `node_modules/.bin` on `PATH`. The scripts then call
  the existing `vp run <script>` from `package.json`, so `package.json` stays the source of truth.

## Adding a task

1. Write `scripts/<group>/<name>.sh` from an existing script (`set -euo pipefail`, source
   `common.sh`, `exec` the command with `"$@"`) and `chmod +x` it. Use Python if the logic
   outgrows a few lines of shell.
2. Add an entry with a `desc:` to `<group>.yml` that calls it with `{{.CLI_ARGS}}`.
3. Run `shellcheck -x scripts/*/*.sh` and `task --list`.
