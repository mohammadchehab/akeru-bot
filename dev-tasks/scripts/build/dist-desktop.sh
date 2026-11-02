#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=SCRIPTDIR/../lib/common.sh
source "$(git rev-parse --show-toplevel)/dev-tasks/scripts/lib/common.sh"

# Package the desktop app. Pass build-desktop-artifact flags, e.g. --platform mac --target dmg --arch arm64.
exec vp run dist:desktop:artifact "$@"
