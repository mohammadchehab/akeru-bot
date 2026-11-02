#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=SCRIPTDIR/../lib/common.sh
source "$(git rev-parse --show-toplevel)/dev-tasks/scripts/lib/common.sh"

# Typecheck, lint, then format check. Stops at the first failure.
checks="$REPO_ROOT/dev-tasks/scripts/check"
"$checks/typecheck.sh"
"$checks/lint.sh"
"$checks/fmt-check.sh"
