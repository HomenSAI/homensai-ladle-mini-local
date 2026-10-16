#!/usr/bin/env bash
# Run only against an expendable emulator/debug app. Does not wipe app data.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p reports
trap 'adb logcat -d -t 4000 > reports/device-logcat.txt 2>&1 || true' EXIT
{
  echo "Host UTC: $(date -u +%FT%TZ)"
  adb devices -l
  adb shell getprop ro.build.version.release
  adb shell getprop ro.build.version.sdk
  adb shell dumpsys webviewupdate
} > reports/device-environment.txt
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w com.homensai.laedle.minilocal.debug.test/com.homensai.laedle.DeviceTests | tee reports/device-tests.txt
grep -q 'RESULTS_OK=true' reports/device-tests.txt
adb exec-out screencap -p > reports/device-screen.png
