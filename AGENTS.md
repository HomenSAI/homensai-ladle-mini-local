# Development rules — Mini Local

One device, no server. Do not introduce cloud, telemetry, external fonts or client accounts. No real customer data in tests. Preserve translation parity DE/EN/RU and the four skins. Domain quantities are integer milli-units; prices are cents. Never mix piece/litre quantities into kg. Do not mutate preorder history when recording actual extras. Partial issue and payment are cumulative. Import replaces after confirmation; no silent reset or destructive migration.

Schema v3, SQLite version2. Preserve v1/v2 imports; unit defaults tokg. Persist only after expected-revision atomic commit. Draft is separate and must not capture passwords. Photos bounded/re-encoded; no remote URLs or arbitrarySVG.

Run npmtest, sourcechecks and all browser suites. Record failures honestly. Native tests25 are prepared but unrun; never claim Chromium is an Android emulator. Build/source/test status inPACKAGE_STATUS.json must stay truthful. No private keys/fonts in delivered archives. Preserve applicationId for future Mini Local updates; changes torelease key require explicit migration/backup planning.

## Language and localization rules — EN / DE / RU

- Keep user-facing UI strings and built-in product/category names available in English (`en`), German (`de`), and Russian (`ru`). A missing translation is a source-check failure; do not silently rely on a fallback for shipped content. User-entered shop, customer, and product text is user data and is not subject to translation checks.
- The setup wizard selects the UI language, and users can change it later in Settings. Route every new user-facing label, hint, error, confirmation, and accessibility name through the localization dictionaries. Do not hard-code translated UI text in markup or application logic. Keep each locale linguistically consistent; official names, technical identifiers, and trademarks may remain as written.
- Every new substantive source-code comment must explain a non-obvious reason, business rule, or algorithm and be written in this order: `EN:`, `DE:`, `RU:`. Skip comments for obvious operations and do not add line-by-line narration. Example:

  ```js
  // EN: Keep actual extras separate so they never change preorder history.
  // DE: Tatsächliche Zusatzkäufe getrennt halten, damit sie die Vorbestellhistorie nicht ändern.
  // RU: Фактические дополнительные покупки хранить отдельно, чтобы не менять историю предзаказа.
  ```

- Commit messages use a short English Conventional Commit title and three explanation lines in EN, DE, RU, in that order. Pull request titles are short English; descriptions contain EN, DE, RU sections, each stating changes, checks actually run, and remaining limitations. Never claim a check or Android build that was not executed.
- Main instructions, feature descriptions, release notes, and user guides must be available in EN, DE, and RU. Keep translation variants aligned when editing them.
- Do not translate class, function, variable, file-path, or technical API identifiers. Consult `docs/LOCALIZATION.md` for the detailed writing and review convention.
- Use `docs/GIT_WORKFLOW.md` for the Gitea-first workflow and safe Windows commands. Keep Gitea as the primary remote (`gitea`) and GitHub as the secondary remote (`github`). Never force-push or guess a clone URL; obtain it from the authenticated server UI/API.
