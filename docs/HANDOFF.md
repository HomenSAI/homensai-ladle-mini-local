# State at pause / Stand bei Pause / Состояние на паузе — 2026-10-16

## English (EN)

Work is paused at the user's request after Git synchronization. Canonical checkout: `C:\homensai\homensai-ladle-mini-local`. Primary remote: `ssh://git@localhost:2223/localadmin/homensai-ladle-mini-local.git` (private Gitea). Secondary: `https://github.com/HomenSAI/homensai-ladle-mini-local.git` (public GitHub). Local `main` tracks `gitea/main`; default pushes go to Gitea.

Gitea PR #1 was reviewed and merged. Local/Gitea/GitHub `main` and tag refs were verified equal at `ebd5b62f39eb0d5756fc2e400aa7d38d866128e5`; there were no tags. This is the baseline immediately before the documentation commit containing this snapshot; use `tools/git-verify.ps1` for the latest SHA. The feature branch is retained. Temporary setup API tokens were removed. Existing SSH identity is used; private keys are not in the repository.

Checks passed: standard `npm test` 174; source/schema/JVM 33; desktop Chromium 37 regression + 38 catalog + 36 Mini Local + 4 preview. PowerShell syntax and secret scan passed. The guarded GitHub synchronization script completed, including a repeat of all checks in a disposable copy without network access. `SHA256SUMS.txt` describes `git archive` output, including declared line endings.

App: `0.3.0`, `versionCode 3`, `applicationId com.homensai.laedle.minilocal`. No installable APK has been produced or verified. All 25 native tests remain unrun. GitHub Android run `38865921724` failed at SDK setup before compilation; the new separate source CI job is configured, but its remote outcome is not part of the verified local results.

Original workspace `C:\homensai\homensai-lädle-mini-local` is preserved because Windows reported it in use. Its user-added untracked folder `Прочитать если делать вариант серверный` was not committed or uploaded. Do not delete it without reviewing local work.

On resume: inspect status/remotes and compare SHAs, then diagnose Android SDK setup, build a debug APK, and perform Android acceptance using fictional data. No APK work, deployment, or scheduled continuation is started during this pause.

## Deutsch (DE)

Die Arbeit ist auf Wunsch des Nutzers nach der Git-Synchronisierung pausiert. Kanonischer Checkout: `C:\homensai\homensai-ladle-mini-local`. Primäres Remote: `ssh://git@localhost:2223/localadmin/homensai-ladle-mini-local.git` (privates Gitea). Sekundär: `https://github.com/HomenSAI/homensai-ladle-mini-local.git` (öffentliches GitHub). Lokales `main` folgt `gitea/main`; Standard-Pushes gehen nach Gitea.

Gitea-PR #1 wurde geprüft und gemergt. Lokales/Gitea-/GitHub-`main` und Tags waren auf `ebd5b62f39eb0d5756fc2e400aa7d38d866128e5` identisch; es gab keine Tags. Dies ist der Stand unmittelbar vor dem Dokumentationscommit dieses Snapshots; den neuesten SHA mit `tools/git-verify.ps1` prüfen. Der Feature-Branch bleibt erhalten. Temporäre API-Tokens wurden entfernt. Der vorhandene SSH-Schlüssel wird verwendet; private Schlüssel sind nicht im Repository.

Bestanden: reguläres `npm test` 174; Source/Schema/JVM 33; Desktop-Chromium 37 Regression + 38 Katalog + 36 Mini Local + 4 Vorschau. PowerShell-Syntax und Geheimnisscan bestanden. Das geschützte GitHub-Sync-Skript wurde vollständig ausgeführt und wiederholte alle Prüfungen in einer temporären Kopie ohne Netzwerkzugriff. `SHA256SUMS.txt` beschreibt die Ausgabe von `git archive` einschließlich festgelegter Zeilenenden.

App: `0.3.0`, `versionCode 3`, `applicationId com.homensai.laedle.minilocal`. Keine installierbare APK wurde erstellt oder bestätigt. Alle 25 nativen Tests sind unausgeführt. Android-Lauf `38865921724` auf GitHub scheiterte bei der SDK-Einrichtung vor der Kompilierung; der neue separate Source-CI-Job ist eingerichtet, sein Remote-Ergebnis gehört nicht zu den bestätigten lokalen Ergebnissen.

Der bisherige Workspace `C:\homensai\homensai-lädle-mini-local` bleibt erhalten, da Windows ihn als verwendet meldete. Sein vom Nutzer hinzugefügter unversionierter Ordner `Прочитать если делать вариант серверный` wurde nicht committet oder hochgeladen. Lokale Arbeit vor einer Löschung prüfen.

Bei Fortsetzung: Status/Remotes und SHAs prüfen, Android-SDK-Einrichtung untersuchen, Debug-APK bauen und Android-Abnahme mit fiktiven Daten durchführen. Während der Pause werden keine APK-Arbeit, Bereitstellung oder geplante Fortsetzung gestartet.

## Русский (RU)

Работа поставлена на паузу по просьбе пользователя после синхронизации Git. Каноническая копия: `C:\homensai\homensai-ladle-mini-local`. Основной remote: `ssh://git@localhost:2223/localadmin/homensai-ladle-mini-local.git` (приватная Gitea). Дополнительный: `https://github.com/HomenSAI/homensai-ladle-mini-local.git` (публичный GitHub). Локальная `main` отслеживает `gitea/main`; отправка по умолчанию направлена в Gitea.

PR №1 в Gitea проверен и объединён. Совпадение локальной/Gitea/GitHub `main` и тегов проверено на `ebd5b62f39eb0d5756fc2e400aa7d38d866128e5`; тегов не было. Это базовое состояние непосредственно перед коммитом данного снимка; актуальный SHA проверять через `tools/git-verify.ps1`. Feature-ветка сохранена. Временные API-токены удалены. Используется существующий SSH-ключ; закрытых ключей в репозитории нет.

Прошли: штатный `npm test` 174; исходники/схема/JVM 33; desktop Chromium 37 регрессионных + 38 каталога + 36 Mini Local + 4 preview. Синтаксис PowerShell и поиск секретов проверены. Защищённый скрипт синхронизации GitHub выполнен полностью с повтором всех проверок во временной копии без сети. `SHA256SUMS.txt` описывает результат `git archive`, включая заданные окончания строк.

Приложение: `0.3.0`, `versionCode 3`, `applicationId com.homensai.laedle.minilocal`. Установочный APK не создан и не проверен. Все 25 native-тестов остаются незапущенными. Android-запуск GitHub `38865921724` остановился при настройке SDK до компиляции; отдельный новый source CI настроен, но его удалённый результат не относится к подтверждённым локальным проверкам.

Исходная папка `C:\homensai\homensai-lädle-mini-local` сохранена: Windows сообщала, что она занята. Добавленная пользователем неотслеживаемая папка `Прочитать если делать вариант серверный` не закоммичена и не отправлена. Не удалять её без проверки локальной работы.

При продолжении: проверить статус/remotes и SHA, затем разобраться с настройкой Android SDK, собрать debug APK и провести Android-приёмку на вымышленных данных. Во время паузы сборка APK, развёртывание и запланированное продолжение не запускаются.
