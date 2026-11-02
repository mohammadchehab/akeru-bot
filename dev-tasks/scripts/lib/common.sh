#!/usr/bin/env bash
# Shared setup for dev-tasks scripts. Source it; do not run it.
# Moves to the repo root, loads Node 24 through fnm when available, and puts
# the workspace's node_modules/.bin (vp, tsgo, ...) on PATH.

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT" || exit 1

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --shell bash)"
  fnm use --silent-if-unchanged 24 >/dev/null 2>&1 ||
    echo "dev-tasks: fnm could not switch to Node 24; using $(node --version 2>/dev/null || echo "no node")" >&2
fi

export PATH="$REPO_ROOT/node_modules/.bin:$PATH"
