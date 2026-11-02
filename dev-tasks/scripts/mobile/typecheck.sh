#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=SCRIPTDIR/../lib/common.sh
source "$(git rev-parse --show-toplevel)/dev-tasks/scripts/lib/common.sh"

exec vp run --filter @akeru/mobile typecheck "$@"
