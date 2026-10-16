# Git workflow / Git-Arbeitsablauf / Порядок работы с Git

| Remote | Verified URL |
|---|---|
| `gitea` (primary) | `ssh://git@localhost:2223/localadmin/homensai-ladle-mini-local.git` |
| `github` (secondary) | `https://github.com/HomenSAI/homensai-ladle-mini-local.git` |

**EN:** Canonical checkout: `C:\homensai\homensai-ladle-mini-local`. The original umlaut-named workspace is retained because it was in use. The existing Gitea account is `localadmin`; the old task's `Homensai-Rent` account does not exist. Windows `git-check.ps1` uses Docker by default and checks a disposable copy with networking disabled. Use `-Native` only when all host dependencies are installed.

**DE:** Kanonischer Checkout: `C:\homensai\homensai-ladle-mini-local`. Der bisherige Workspace mit Umlaut bleibt erhalten, da er verwendet wurde. Das vorhandene Gitea-Konto heißt `localadmin`; `Homensai-Rent` aus der alten Aufgabe existiert nicht. Unter Windows nutzt `git-check.ps1` standardmäßig Docker und prüft eine temporäre Kopie ohne Netzwerk. `-Native` nur mit vollständig installierten Host-Abhängigkeiten verwenden.

**RU:** Каноническая рабочая копия: `C:\homensai\homensai-ladle-mini-local`. Старая папка с умлаутом сохранена, поскольку была занята. Существующий аккаунт Gitea — `localadmin`; указанный в старом задании `Homensai-Rent` отсутствует. В Windows `git-check.ps1` по умолчанию использует Docker и проверяет временную копию без сети. Параметр `-Native` использовать только при установленных зависимостях на компьютере.

## English (EN)

### Remotes and branches

- `gitea` is the primary remote. Get its clone URL from the authenticated repository page; never guess it. The repository owner is `localadmin`, with canonical slug `homensai-ladle-mini-local`.
- `github` is secondary: `https://github.com/HomenSAI/homensai-ladle-mini-local.git`.
- `main` is stable. Use `feature/<topic>`, `fix/<topic>`, and `release/<version>` branches. Review and merge substantial changes through a Gitea pull request.
- Work locally if GitHub is unavailable. Do not force-push, mirror, rewrite shared history, or delete unfinished branches.

### Safe sequence

1. `.\tools\git-status.ps1` to inspect status, branches, and remotes.
2. Create a topic branch from an updated `main`.
3. Run `.\tools\git-check.ps1`; stop on the first failure and record unavailable checks honestly.
4. Commit with a short English Conventional Commit title and EN, DE, RU explanations in that order.
5. `.\tools\git-sync-local.ps1` pushes only the already committed current branch to Gitea. It never commits automatically.
6. Open and review a Gitea PR. Merge only after checks and review pass. Update local `main` from Gitea.
7. After Gitea `main` is verified, run `.\tools\git-sync-github.ps1 -PublishConfirmed` to publish the same `main` commit. GitHub publishing requires this explicit switch.
8. Run `.\tools\git-verify.ps1` to compare remote `main` SHAs and tags.

Each push script stops on errors, requires a clean worktree, and uses ordinary fast-forward push. It never uses `--force` or creates commits. Test reports may change tracked files; inspect and commit those separately before syncing.

### Release identity

Keep `applicationId` unchanged. Use SemVer in `versionName`, increase `versionCode`, update `CHANGELOG.md`, verify build/device status, then create an annotated `vMAJOR.MINOR.PATCH` tag. Push tags to Gitea first; mirror them to GitHub only with publication approval. Git tags do not create GitHub Release objects.

## Deutsch (DE)

### Remotes und Branches

- `gitea` ist das primäre Remote. Die Klon-URL von der angemeldeten Repositoryseite übernehmen, nicht erraten. Eigentümer ist `localadmin`, der kanonische Slug `homensai-ladle-mini-local`.
- `github` ist sekundär: `https://github.com/HomenSAI/homensai-ladle-mini-local.git`.
- `main` bleibt stabil. Für Änderungen `feature/<thema>`, `fix/<thema>` und `release/<version>` verwenden. Größere Änderungen über einen Gitea-Pull-Request prüfen und zusammenführen.
- Bei nicht verfügbarem GitHub lokal weiterarbeiten. Kein Force-Push, Mirror, Umschreiben gemeinsamer Historie oder automatisches Löschen unfertiger Branches.

### Sichere Reihenfolge

1. Mit `tools\git-status.ps1` Status, Branches und Remotes prüfen.
2. Einen Themen-Branch von einem aktuellen `main` erstellen.
3. `tools\git-check.ps1` ausführen; beim ersten Fehler stoppen und nicht verfügbare Prüfungen korrekt dokumentieren.
4. Mit kurzem englischem Conventional-Commit-Titel und Erklärungen auf EN, DE, RU in dieser Reihenfolge committen.
5. `tools\git-sync-local.ps1` überträgt nur den bereits committeten aktuellen Branch zu Gitea. Das Skript erstellt keine Commits.
6. Einen Gitea-PR öffnen und prüfen. Erst nach erfolgreichen Prüfungen und Review mergen. Lokales `main` von Gitea aktualisieren.
7. Nach bestätigtem Gitea-`main` `tools\git-sync-github.ps1 -PublishConfirmed` ausführen, um denselben `main`-Commit zu veröffentlichen. Die explizite Option ist erforderlich.
8. Mit `tools\git-verify.ps1` die SHAs von `main` und Tags vergleichen.

Push-Skripte stoppen bei Fehlern, verlangen einen sauberen Arbeitsbaum und verwenden normalen Fast-Forward-Push. Sie verwenden weder `--force` noch erstellen sie Commits. Testberichte können versionierte Dateien ändern; diese separat prüfen und committen.

### Release-Identität

`applicationId` unverändert lassen. SemVer in `versionName` verwenden, `versionCode` erhöhen, `CHANGELOG.md` aktualisieren und Build-/Gerätestatus prüfen. Danach einen annotierten Tag `vMAJOR.MINOR.PATCH` erstellen. Tags zuerst nach Gitea übertragen; nach GitHub nur mit Freigabe spiegeln. Git-Tags erstellen keine GitHub-Release-Objekte.

## Русский (RU)

### Remotes и ветки

- `gitea` — основной remote. Clone URL брать с авторизованной страницы репозитория, не угадывать. Владелец — `localadmin`, канонический slug — `homensai-ladle-mini-local`.
- `github` — дополнительный: `https://github.com/HomenSAI/homensai-ladle-mini-local.git`.
- `main` — стабильная ветка. Использовать `feature/<тема>`, `fix/<тема>`, `release/<версия>`. Существенные изменения проверять и объединять через Pull Request в Gitea.
- Если GitHub недоступен, продолжать локально. Не делать force push, mirror, переписывание общей истории и автоматическое удаление незавершённых веток.

### Безопасный порядок

1. `tools\git-status.ps1` — проверить статус, ветки и remotes.
2. Создать тематическую ветку от обновлённого `main`.
3. Запустить `tools\git-check.ps1`; при первой ошибке остановиться и честно записать недоступные проверки.
4. Создать коммит с коротким английским заголовком Conventional Commit и пояснениями EN, DE, RU именно в этом порядке.
5. `tools\git-sync-local.ps1` отправляет только уже закоммиченную текущую ветку в Gitea. Автоматические коммиты запрещены.
6. Открыть и проверить PR в Gitea. Объединять только после успешных проверок и ревью. Обновить локальную `main` из Gitea.
7. После проверки `main` в Gitea выполнить `tools\git-sync-github.ps1 -PublishConfirmed`, чтобы опубликовать тот же коммит `main`. Для GitHub требуется явный параметр подтверждения.
8. `tools\git-verify.ps1` сравнивает SHA веток `main` и тегов на обоих серверах.

Скрипты отправки останавливаются при ошибке, требуют чистое рабочее дерево и используют обычный fast-forward push. Они не запускают `--force` и не создают коммиты. Тесты могут изменить отслеживаемые отчёты; их нужно отдельно проверить и закоммитить.

### Идентичность релиза

Сохранять `applicationId`. Использовать SemVer в `versionName`, увеличивать `versionCode`, обновлять `CHANGELOG.md` и проверять статус сборки/устройства. Затем создать аннотированный тег `vMAJOR.MINOR.PATCH`. Сначала отправлять теги в Gitea; копировать их в GitHub только с разрешением на публикацию. Git-теги сами по себе не создают объекты GitHub Releases.
