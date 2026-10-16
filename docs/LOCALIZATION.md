# Localization standard / Lokalisierungsstandard / Стандарт локализации

## English (EN)

The supported locales are English (`en`), German (`de`), and Russian (`ru`). The first-run wizard lets the shop choose a language; the language remains changeable under Settings. UI copy lives in `app/src/main/assets/www/i18n.js`; built-in product and category names live in `catalog-data.js`. Keep each entry complete and non-empty in all three locales. `tools/check.py` fails when UI, mini UI, or built-in catalog translations are missing. Custom names entered by the shop are data, not shipped translations.

Use the selected locale consistently for labels, help, errors, dialogs, and accessibility text. Preserve official names, trademarks, and technical identifiers where translation would be incorrect. Keep identifiers such as class/function/variable names, paths, and API names unchanged. New substantive code comments explain a decision, business rule, or non-obvious algorithm; write the same comment in EN, DE, RU order and prefix each line with its language code. Do not comment obvious operations.

For commits, use a short English Conventional Commit title followed by concise `EN:`, `DE:`, and `RU:` descriptions in that order. PR titles are short English. PR descriptions have EN, DE, and RU sections that each cover changes, checks actually run, and remaining limitations. Release notes and primary user instructions/guides must be available in all three languages and kept aligned.

## Deutsch (DE)

Unterstützt werden Englisch (`en`), Deutsch (`de`) und Russisch (`ru`). Der Einrichtungsassistent lässt die Sprache beim ersten Start auswählen; später kann sie unter „Einstellungen“ geändert werden. UI-Texte stehen in `app/src/main/assets/www/i18n.js`, Namen der integrierten Artikel und Kategorien in `catalog-data.js`. Jeder Eintrag muss in allen drei Sprachen vorhanden und nicht leer sein. `tools/check.py` meldet fehlende UI-, Mini-UI- oder Katalogübersetzungen als Fehler. Eigene Namen des Ladens sind Daten und keine ausgelieferten Übersetzungen.

Beschriftungen, Hilfetexte, Fehlermeldungen, Dialoge und Barrierefreiheitstexte müssen durchgehend in der gewählten Sprache erscheinen. Offizielle Namen, Marken und technische Bezeichner bleiben unverändert, wenn eine Übersetzung falsch wäre. Klassen-, Funktions- und Variablennamen, Pfade und API-Bezeichner werden nicht übersetzt. Neue inhaltliche Codekommentare erklären eine Entscheidung, Geschäftsregel oder einen nicht offensichtlichen Algorithmus. Sie stehen in der Reihenfolge EN, DE, RU; jede Zeile erhält das passende Sprachkürzel. Offensichtliche Abläufe werden nicht kommentiert.

Commits erhalten einen kurzen englischen Conventional-Commit-Titel und danach knappe Beschreibungen mit `EN:`, `DE:` und `RU:` in dieser Reihenfolge. PR-Titel sind kurz und englisch. PR-Beschreibungen enthalten Abschnitte auf EN, DE und RU; jeder nennt Änderungen, tatsächlich ausgeführte Prüfungen und verbleibende Einschränkungen. Versionshinweise sowie zentrale Anleitungen und Benutzerhandbücher müssen in allen drei Sprachen verfügbar und inhaltlich abgestimmt sein.

## Русский (RU)

Поддерживаются английский (`en`), немецкий (`de`) и русский (`ru`). При первом запуске язык выбирается в мастере настройки; позже его можно изменить в разделе настроек. Тексты интерфейса хранятся в `app/src/main/assets/www/i18n.js`, встроенные названия товаров и категорий — в `catalog-data.js`. Каждый перевод должен присутствовать и быть непустым во всех трёх языках. `tools/check.py` завершится ошибкой при отсутствии перевода интерфейса, компактного интерфейса или встроенного каталога. Пользовательские названия магазина и товаров — это данные, а не встроенные переводы.

Подписи, подсказки, ошибки, диалоги и тексты доступности должны быть последовательно на выбранном языке. Официальные названия, торговые марки и технические обозначения оставляют без перевода, если перевод будет неверным. Имена классов, функций, переменных, пути и API-идентификаторы не переводят. Новые содержательные комментарии в коде объясняют решение, бизнес-правило или неочевидный алгоритм. Порядок строк: EN, DE, RU; каждую строку начинают с соответствующего кода языка. Очевидные операции комментировать не нужно.

Для коммитов используйте короткий английский заголовок Conventional Commit, затем краткие пояснения с префиксами `EN:`, `DE:`, `RU:` именно в этом порядке. Заголовки PR должны быть короткими и английскими. Описание PR содержит разделы EN, DE и RU; каждый указывает изменения, фактически выполненные проверки и оставшиеся ограничения. Основные инструкции, описания функций, заметки о версиях и руководства пользователя должны быть доступны на всех трёх языках и поддерживаться согласованно.
