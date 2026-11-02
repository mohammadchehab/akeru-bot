#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=SCRIPTDIR/../lib/common.sh
source "$(git rev-parse --show-toplevel)/dev-tasks/scripts/lib/common.sh"

# No argument: every workspace package. First argument a package directory
# (e.g. apps/server): that package only; the rest is forwarded to its test script.
if [[ $# -gt 0 && -f "${1%/}/package.json" ]]; then
  pkg="${1%/}"
  shift
  exec vp run --filter "./$pkg" test "$@"
fi
exec vp run -r test "$@"
