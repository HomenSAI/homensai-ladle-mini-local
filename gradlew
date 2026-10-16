#!/bin/sh
# Source-only, checksum-verified launcher. See tools/gradle_bootstrap.py.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$HERE/tools/gradle_bootstrap.py" "$@"
