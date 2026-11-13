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
## Mandatory AI preflight and token-cost optimization (owner instruction, 2026-11-12, updated with measurements)

Before substantive work, map the **complete tracked project structure** and active state; read README, root/nested AGENTS and CLAUDE rules, architecture/status/handoff/decisions, manifests, dependencies, CI, tests, configuration and relevant sources **end-to-end**. Distinguish current files from archives/generated/vendor/sensitive content. Reuse a concise, version-aware project context map; refresh changing facts. Never blindly paste an entire repository, log or JSON into a model prompt; trim tool output.

**Prompt caching is the main cost lever and is always on** (owner, 12.11.2026). A cache read costs 0.05× of input on Claude Opus 5.5 / Sonnet 5.5; a write costs 1.25× (5 min) or 2× (1 h), so caching pays only where the same prefix is read again.

- **Claude Code (subscription or API key):** user settings `~/.claude/settings.json` contain `"promptCacheTtl": "1h"` and `"subagentPromptCacheTtl": "1h"` (or env `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h`; recreate them in temporary cloud containers). Without them subagents use 5 min and any wait longer than 5 min rewrites the agent's whole context (Rent, 12.11: 61 % of all cache writes). Do not switch model, effort or fast mode mid-session; continue a running agent (SendMessage) or fork the current one instead of starting a fresh agent; run long commands in the background; keep agent reports short.
- **Direct Claude Messages API:** order `tools → system → messages`; put shared stable material (code, specs, examples) first with `cache_control` at its end and the changing question after it; no timestamps/IDs/unsorted JSON in the prefix; max 4 breakpoints, 20-block lookback, model minimum length (512 tokens on the 5.x models). Policy measured 12.11: **1 task → no cache marks** (a lone 1 h write cost ×0.74 of the old way); **2+ tasks starting together → 5 min marks + one `max_tokens: 0` pre-warm** before the parallel calls (parallel requests cannot read an entry still being written); **3+ queued tasks or multi-round continuations → 1 h**. Verify `cache_creation_input_tokens` / `cache_read_input_tokens`; remove marks that are never read.
- **Every report on API work compares with cache against the old way:** "with cache $X, old way $Y, saved $Z, ×K" (old way = all input tokens at the base price). Measured 12.11: 3 tasks sharing one context ×3.75–5.17 per task, ×2.24 for the job including the pre-warm.
- **Other providers:** keep the same stable-prefix layout; enable caching only as their current docs describe. If a repo has no qualifying API calls, record **"API prompt caching not applicable"** and optimize context retrieval instead. Never cache or expose secrets or confidential user data unnecessarily; provider retention, privacy and safety rules outrank optimization.

Before finishing, report inspected sources, caching opportunities/implementation, real metrics vs estimates, tests and limitations. Follow existing repo safety/branch/release rules.

Canonical policy: https://github.com/HomenSAI/homensai-core/blob/main/docs/AI_CONTEXT_EFFICIENCY_POLICY.md
<!-- HSAI-AI-CONTEXT-CACHING-POLICY:END -->

<!-- HSAI-NANOGPT-MODELS:BEGIN -->
## NanoGPT models (owner decision 13.11.2026; measured on 12-13.11.2026)

Use NanoGPT (monthly subscription endpoint `https://nano-gpt.com/api/subscription/v1/chat/completions`, key from the user environment
`NANOGPT_API_KEY`, never printed or committed) only with these models and roles:

| Role | Model | reasoning_effort | max_tokens |
|---|---|---|---|
| Code (short tasks), code review, error/log diagnosis | `z-ai/glm-5.3:thinking` | high | 100000 |
| Tests from the spec, second opinion, texts and translations (default) | `deepseek/deepseek-v4-pro-0813:thinking` | high | 100000 |
| C code ONLY (narrow task, e.g. a Lua->C port) | `moonshotai/kimi-k2.7-code` | not sent | 65536 (model ceiling) |

Rules:
- At most **2 requests at once per model** (total <= 8); stream responses; on 429/503 wait `Retry-After` and retry.
- Answer limit 100 000 tokens: an empty answer with completion_tokens == max_tokens means the model spent the budget thinking - retry
  up to 5 times in total, only then stop (then give the task to DeepSeek V4 Pro). Never pin a provider (`X-Provider` is billed pay-as-you-go outside the subscription).
- Every complex problem goes in parallel to the models with a full dossier; Claude writes its own answer first (sealed) and compares.
- Model output is a proposal: nothing is accepted without our own tests and a Claude review. No secrets or personal data in prompts.
- Not used (measured weaker or unreliable): GLM-5.2, Nemotron 3 Ultra, Qwen3 Coder, DeepSeek V4.1 flash-1017, MiniMax M3, Devstral 2.

Why (12-13.11.2026 benchmark on real project tasks): GLM-5.3 was first in error diagnosis (found bugs and causes the others and Claude
missed), code review, our own functions graded by our unit tests (53 %), long tasks and test generation (74/75 cases consistent);
DeepSeek V4 Pro was the most reliable (no empty answers at 100K) and second in diagnosis; Kimi K2.7 Code wrote the best C port
(20 000-case differential check: 0 failures) but is weak on Python (25 %) and gave more empty answers.
<!-- HSAI-NANOGPT-MODELS:END -->
