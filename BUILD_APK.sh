#!/bin/sh
set -eu
cd "$(dirname "$0")"
./gradlew --no-daemon :app:lintDebug :app:assembleDebug
printf '\nTest APK: app/build/outputs/apk/debug/app-debug.apk\n'
