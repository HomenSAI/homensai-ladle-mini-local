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

<!-- HSAI-AI-CONTEXT-CACHING-POLICY:BEGIN -->
## Mandatory AI preflight and token-cost optimization (owner instruction, 2026-11-12)

Before substantive work, map the **complete tracked project structure** and active state; read README, root/nested AGENTS and CLAUDE rules, architecture/status/handoff/decisions, manifests, dependencies, CI, tests, configuration and relevant sources **end-to-end**. Distinguish current files from archives/generated/vendor/sensitive content. Reuse a concise, version-aware project context map; refresh changing facts. Never blindly paste an entire repository into a model prompt.

**Audit before coding:** classify stable vs dynamic context (tools, instructions, common documents/examples, conversations, results). Reuse compact summaries, targeted reads and diffs; plan model choice, token budget, prompt caching and measurements. For direct Claude Messages API, enable top-level `cache_control: {"type":"ephemeral"}` for reusable conversation prefixes or explicit breakpoints at the **end of stable prefixes**; keep changing content after them, order `tools → system → messages`, respect 4 slots, 20-block lookback, model minimum lengths and invalidations. Default TTL 5m; use 1h only when justified by measured reuse economics. Measure `cache_creation_input_tokens`, `cache_read_input_tokens`, baseline costs/latency, and correctness; disable ineffective caching. Never cache/expose secrets unnecessarily.

**Claude Code is not the same as an API client:** use only its supported built-in context/cache behavior; these repository rules do not raise subscription limits. If a repo has no qualifying Claude API calls, mark API caching **not applicable**, and optimize context retrieval instead. Before finishing, report inspected sources, caching opportunities/implementation, real metrics vs estimates, tests and limitations. Follow existing repo safety/branch/release rules.

Canonical policy: https://github.com/HomenSAI/homensai-core/blob/main/docs/AI_CONTEXT_EFFICIENCY_POLICY.md
<!-- HSAI-AI-CONTEXT-CACHING-POLICY:END -->
