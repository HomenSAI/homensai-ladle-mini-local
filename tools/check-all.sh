#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p reports
{ node --version; python3 --version; javac --version; chromium --version; printf '%s\n' 'Desktop Chromium tests; Android SDK/build/device tests are not covered by this image.'; } | tee reports/environment-current.txt
npm test | tee reports/node-tests.txt
python3 tools/check.py | tee reports/source-checks.txt
python3 tools/make_preview.py
python3 tests/ui_test.py --in-memory | tee reports/ui-tests.txt
python3 tests/catalog_ui_test.py | tee reports/catalog-ui-tests.txt
python3 tests/mini_ui_test.py | tee reports/mini-ui-tests.txt
python3 tests/preview_test.py | tee reports/preview-tests.txt
