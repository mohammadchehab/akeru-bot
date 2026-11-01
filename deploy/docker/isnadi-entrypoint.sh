#!/bin/sh
set -eu
# Isnadi state lives in ISNADI_HOME. The server reads T3CODE_HOME, so derive it here and never
# inherit an ambient T3 Code home.
ISNADI_HOME="${ISNADI_HOME:-$HOME/.isnadi}"
T3CODE_HOME="$ISNADI_HOME"
export ISNADI_HOME T3CODE_HOME
if [ "${ISNADI_REMOTE_IDENTITY_READY:-0}" != 1 ]; then
  ISNADI_REMOTE_IDENTITY_READY=1 ISNADI_IDENTITY_NODE="$(command -v node)" \
    /opt/isnadi/initialize-remote-identity.sh
  export ISNADI_REMOTE_IDENTITY_READY
fi
if [ "$#" -gt 0 ] && [ "$1" = remote ]; then
  shift
  exec /opt/isnadi/remote-admin "$@"
fi
exec node /opt/isnadi/node_modules/isnadibot/dist/bin.mjs "$@"
