#!/usr/bin/env bash
# Caps how many CI jobs run at once on the self-hosted Hetzner box. Each runner calls this from its job hooks
# (ACTIONS_RUNNER_HOOK_JOB_STARTED -> `acquire`, ACTIONS_RUNNER_HOOK_JOB_COMPLETED -> `release`). A job that
# finds every slot taken waits; it is never cancelled. The workflow, `runs-on` and the shard matrix are untouched.
#
# State lives in /opt/ci-gate: `limit` (one number, read on every call, so changing it needs no restart),
# `slots/<Runner.Worker pid>` (one file per running job) and `gate.log`. A slot whose process has died is
# reclaimed. The gate fails open: after CI_GATE_MAX_WAIT seconds, or on any internal error, the job runs anyway,
# so a gate bug can slow CI but never block it. Installation and rollback: docs/internals/ci.md.
set -u

DIR="${CI_GATE_DIR:-/opt/ci-gate}"
MAX_WAIT="${CI_GATE_MAX_WAIT:-1200}"
mode="${1:-}"
# Runner hooks are called with no arguments, so the symlinks job-started.sh and job-completed.sh pick the mode.
if [ -z "$mode" ]; then
  case "$(basename "$0")" in
    job-started.sh) mode=acquire ;;
    job-completed.sh) mode=release ;;
  esac
fi

# The pid that owns the job: the nearest Runner.Worker ancestor. CI_GATE_PID overrides it for tests.
worker_pid() {
  if [ -n "${CI_GATE_PID:-}" ]; then echo "$CI_GATE_PID"; return; fi
  local pid=$$
  while [ "$pid" -gt 1 ]; do
    if [ "$(cat "/proc/$pid/comm" 2>/dev/null)" = "Runner.Worker" ]; then echo "$pid"; return; fi
    pid=$(awk '{print $4}' "/proc/$pid/stat" 2>/dev/null || echo 1)
  done
  echo "$$"
}

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >>"$DIR/gate.log" 2>/dev/null || true; }

acquire() {
  mkdir -p "$DIR/slots" || exit 0
  local pid limit used waited=0
  pid=$(worker_pid)
  while :; do
    limit=$(cat "$DIR/limit" 2>/dev/null || echo 6)
    # The lock is held only while counting and claiming, never while waiting.
    if (
      flock -x 9
      used=0
      for slot in "$DIR"/slots/*; do
        [ -e "$slot" ] || continue
        if kill -0 "$(basename "$slot")" 2>/dev/null; then used=$((used + 1)); else rm -f "$slot"; fi
      done
      [ "$used" -lt "$limit" ] && : >"$DIR/slots/$pid"
    ) 9>"$DIR/lock"; then
      [ "$waited" -gt 0 ] && log "acquire pid=$pid waited=${waited}s limit=$limit"
      exit 0
    fi
    if [ "$waited" -ge "$MAX_WAIT" ]; then log "acquire pid=$pid gave up after ${waited}s, running anyway"; exit 0; fi
    sleep 5
    waited=$((waited + 5))
  done
}

release() { rm -f "$DIR/slots/$(worker_pid)" 2>/dev/null || true; exit 0; }

case "$mode" in
  acquire) acquire ;;
  release) release ;;
  *) echo "usage: hetzner-gate.sh acquire|release" >&2; exit 2 ;;
esac
