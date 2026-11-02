#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=SCRIPTDIR/../lib/common.sh
source "$(git rev-parse --show-toplevel)/dev-tasks/scripts/lib/common.sh"

# No argument: every workspace package. First argument a package directory
# (e.g. apps/web): that package only.
if [[ $# -gt 0 && -f "${1%/}/package.json" ]]; then
  pkg="${1%/}"
  shift
  run_filtered "./$pkg" typecheck "$@"
fi
exec vp run -r --concurrency-limit 2 typecheck "$@"
