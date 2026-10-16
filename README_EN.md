# HomenS.AI — Lädle Mini Local 0.3.0

**Languages / Sprachen / Языки:** EN · [DE](README_DE.md) · [RU](README.md)

An offline order book for one farm shop phone or tablet. No server, account, subscription, messaging, or sync. The app and built-in catalog support EN / DE / RU and four themes.

**Package status:** Android source project and browser preview; this folder does not contain an installable APK. Android build and device acceptance have not been completed. Start with fictional data until acceptance is complete.

## Start here

- User guide: [English](docs/USER_GUIDE_EN.md) · [Deutsch](docs/USER_GUIDE_DE.md) · [Русский](docs/USER_GUIDE_RU.md)
- Development localization standard: [docs/LOCALIZATION.md](docs/LOCALIZATION.md)
- Local Gitea-first Git workflow: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)
- Browser preview: [preview/Laedle-preview.html](preview/Laedle-preview.html)
- Build/install: [docs/BUILD.md](docs/BUILD.md); device acceptance: [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)
- Test evidence and limitations: [docs/TEST_REPORT.md](docs/TEST_REPORT.md)

## Checks

Run `npm test`, `python tools/check.py`, `python tools/make_preview.py`, then the browser suites described in `AGENTS.md`. Browser tests are not Android device tests. The delivered build status is tracked in `PACKAGE_STATUS.json`.

## Project layout

`core.js` contains domain rules and calculations; `ui.js` renders the interface; `i18n.js` contains localized UI strings; `storage.js` handles local persistence and encrypted exports. Java provides the local WebView host, SQLite persistence, and bounded photo import. There are no runtime npm dependencies or external fonts.
