# HomenS.AI — Lädle Mini Local 0.3.0

**Languages / Sprachen / Языки:** [EN](README_EN.md) · DE · [RU](README.md)

Ein Offline-Bestellbuch für das Telefon oder Tablet eines Hofladens. Kein Server, Konto, Abonnement, Nachrichtenversand oder Sync. App und integrierter Katalog unterstützen EN / DE / RU und vier Darstellungen.

**Lieferstatus:** Android-Quellprojekt und Browser-Vorschau; dieser Ordner enthält keine installierbare APK. Android-Build und Geräteabnahme sind noch nicht abgeschlossen. Bis zur Abnahme nur fiktive Daten verwenden.

## Einstieg

- Benutzerhandbuch: [English](docs/USER_GUIDE_EN.md) · [Deutsch](docs/USER_GUIDE_DE.md) · [Русский](docs/USER_GUIDE_RU.md)
- Lokalisierungsstandard für die Entwicklung: [docs/LOCALIZATION.md](docs/LOCALIZATION.md)
- Gitea-zuerst-Git-Arbeitsablauf: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)
- Browser-Vorschau: [preview/Laedle-preview.html](preview/Laedle-preview.html)
- Build/Installation: [docs/BUILD.md](docs/BUILD.md); Geräteabnahme: [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)
- Testnachweise und Einschränkungen: [docs/TEST_REPORT.md](docs/TEST_REPORT.md)

## Prüfungen

`npm test`, `python tools/check.py`, `python tools/make_preview.py` und anschließend die in `AGENTS.md` aufgeführten Browser-Suiten ausführen. Browser-Tests sind keine Android-Gerätetests. Der ausgelieferte Build-Status steht in `PACKAGE_STATUS.json`.

## Projektstruktur

`core.js` enthält Geschäftsregeln und Berechnungen; `ui.js` rendert die Oberfläche; `i18n.js` enthält lokalisierte UI-Texte; `storage.js` verwaltet lokale Speicherung und verschlüsselte Exporte. Java stellt den lokalen WebView-Host, die SQLite-Speicherung und den begrenzten Fotoimport bereit. Es gibt keine npm-Laufzeitabhängigkeiten und keine externen Schriftarten.
