# Architecture and repository decisions / Architektur- und Repository-Entscheidungen / Архитектурные решения и решения по репозиторию

**EN:** The verified local Gitea administrator is `localadmin`. Use its private repository and the existing SSH key. No new user account or private key was created. Keep the original workspace intact and use the canonical checkout `C:\homensai\homensai-ladle-mini-local`.

**DE:** Der bestätigte lokale Gitea-Administrator ist `localadmin`. Sein privates Repository und der vorhandene SSH-Schlüssel werden verwendet. Kein neues Benutzerkonto oder privater Schlüssel wurde erstellt. Der bisherige Workspace bleibt erhalten; der kanonische Checkout ist `C:\homensai\homensai-ladle-mini-local`.

**RU:** Проверенный локальный администратор Gitea — `localadmin`. Используются его приватный репозиторий и существующий SSH-ключ. Новый аккаунт и закрытый ключ не создавались. Исходная папка сохраняется, каноническая рабочая копия — `C:\homensai\homensai-ladle-mini-local`.

## English (EN)

- Canonical repository/project slug: `homensai-ladle-mini-local`. Keep the user-facing product name “HomenS.AI — Lädle Mini Local”.
- Keep the Android `applicationId` `com.homensai.laedle.minilocal` and the existing version history. A repository rename must not change app update identity.
- One device, offline, no server, cloud sync, telemetry, external fonts, or customer accounts.
- Local Gitea is the primary Git server (`gitea` remote). GitHub is a separate secondary remote (`github`). Never combine push URLs or use force push.
- Do not guess the Gitea clone URL. Obtain it from the authenticated Gitea repository page/API. Do not store credentials in Git config URLs or project files.
- GitHub repository visibility is currently public. Do not publish customer data, local databases, secrets, signing keys, or build artifacts.
- Release version stays SemVer. Android `versionCode` increases monotonically; existing tags and releases are never rewritten.

## Deutsch (DE)

- Der kanonische Repository-/Projekt-Slug lautet `homensai-ladle-mini-local`. Der sichtbare Produktname bleibt „HomenS.AI — Lädle Mini Local“.
- Die Android-`applicationId` `com.homensai.laedle.minilocal` und die Versionshistorie bleiben erhalten. Eine Repository-Umbenennung darf die Update-Identität der App nicht ändern.
- Ein Gerät, offline, kein Server, Cloud-Sync, Telemetrie, externe Schriftarten oder Kundenkonten.
- Lokales Gitea ist der primäre Git-Server (Remote `gitea`). GitHub ist ein getrenntes sekundäres Remote (`github`). Keine kombinierten Push-URLs und kein Force-Push.
- Die Gitea-Klon-URL nicht erraten. Sie muss auf der angemeldeten Gitea-Repositoryseite oder über die API ermittelt werden. Zugangsdaten gehören weder in Git-URLs noch in Projektdateien.
- Das GitHub-Repository ist derzeit öffentlich. Keine Kundendaten, lokalen Datenbanken, Geheimnisse, Signaturschlüssel oder Build-Artefakte veröffentlichen.
- Versionen folgen SemVer. Android-`versionCode` steigt monoton; bestehende Tags und Releases werden nie umgeschrieben.

## Русский (RU)

- Канонический slug репозитория и проекта: `homensai-ladle-mini-local`. Пользовательское название продукта остаётся «HomenS.AI — Lädle Mini Local».
- Сохранять Android `applicationId` `com.homensai.laedle.minilocal` и историю версий. Переименование репозитория не должно менять идентичность обновлений приложения.
- Одно устройство, офлайн; без сервера, облачной синхронизации, телеметрии, внешних шрифтов и аккаунтов покупателей.
- Локальная Gitea — основной Git-сервер (remote `gitea`). GitHub — отдельный дополнительный remote (`github`). Не объединять URL отправки и не использовать force push.
- Не угадывать clone URL Gitea. Получить его из авторизованной страницы репозитория или API. Не сохранять учётные данные в URL Git или файлах проекта.
- Сейчас репозиторий GitHub публичный. Не публиковать данные покупателей, локальные базы, секреты, ключи подписи и результаты сборки.
- Версии приложения следуют SemVer. Android `versionCode` увеличивается монотонно; существующие теги и релизы не переписываются.
