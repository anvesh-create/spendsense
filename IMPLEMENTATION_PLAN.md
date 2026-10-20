# SpendSense Implementation Plan

## 1. Workspace and implementation status

- The current workspace contains a React/TypeScript/Vite frontend and FastAPI backend. SQLite remains the local fallback; optional PostgreSQL support is configured with `DATABASE_URL`.
- The application is a **local single-user MVP**, not a production multi-user deployment. It has no authentication/authorization boundary; do not expose it to a network or treat its data as isolated between users.
- A root `.env` file is present and is private local configuration; it was not read or modified during this integration. `.gitignore` excludes it. Keep credentials in backend environment variables and out of source control.
- A separately packaged mobile app is not part of this implementation; the web UI is responsive.

### Implemented functionality and remaining gaps

- Implemented: import selection/drop, remove/replace, selected currency, CSV/XLSX and conservative text-PDF parsing, error/loading states, duplicate handling, SQLite persistence, dashboard, transactions with search/sort/date/category filters and pagination, analytics, merchant aggregation/details, import comparison, PDF/CSV report exports, history and confirmed deletion, settings/theme, global search, and Personal Agent.
- Personal Agent is deterministic by default. Groq is an optional OpenAI-compatible backend provider, enabled only when configured and after explicit opt-in in Settings; the legacy `AI_*` provider settings remain supported. Hosted calls receive the question and minimized statement aggregates. Provider failure returns a visible notice and deterministic answer.
- Optional PostgreSQL uses a pooled psycopg connection and non-destructive schema initialization. SQLite remains the default when `DATABASE_URL` is empty. No SQLite-to-PostgreSQL data transfer is performed.
- Parser limitations: legacy XLS, scanned PDFs/OCR, ambiguous slash dates, and unrecognized/bank-specific statement layouts are rejected or reported. Users select the statement currency; no currency conversion is performed.
- Still required before production: authentication and authorization, multi-user isolation, deployment-specific secret/storage policy, real bank statement compatibility testing, OCR if desired, report history, and a dedicated frontend/browser end-to-end test suite. No production deployment has been performed.
- Verification for the current integration: 43 backend tests and 10 frontend tests pass, and the production frontend build succeeds. Groq behavior is tested with mocks; no live Groq request or Supabase connection was made. PostgreSQL runtime behavior against a real Supabase project remains unverified. This verification is not production security certification.

## 2. Screen inventory and reference mapping

| Screen / route proposal | Main responsibilities | References |
|---|---|---|
| Import (`/`) | Brand-led upload entry; select, remove, replace, validate, and submit a statement; navigate to Overview and History | UI_01, UI_02, UI_03, UI_04, UI_08; showcase mobile import; WhatsApp 10.48.31 |
| Overview/Dashboard (`/overview`) | Period summary, income, expenses, balance/net flow, transaction count, category chart, recent transactions, trends, merchant spend; useful no-data state | UI_06, UI_13, UI_16; showcase; WhatsApp 10.48.32 |
| Transactions (`/transactions`) | Search, sort, date/category filter, transaction details and income/expense styling | UI_07; showcase |
| Analytics (`/analytics`) | Category distribution, income versus expense by month, top categories, category breakdown, period controls | UI_05; showcase interactive chart |
| Individual Spending (`/spending`) | Merchant/source totals, count, category, share, filters, merchant detail view | UI_11; showcase merchant detail |
| Compare Imports (`/compare`) | Pick two saved analyses; summary and category comparison with absolute and percentage changes | UI_15; showcase comparison results |
| Report (`/reports`) | Preview for selected analysis/period, downloadable report, export options, saved/recent report metadata | UI_09; showcase report options; WhatsApp 10.48.32 |
| History/Past Overviews (`/history`) | List saved statement analyses, period and analysis date, open/reopen, overflow actions, confirmed deletion | UI_14; showcase open overview/search/delete; WhatsApp 10.48.32 |
| Settings (`/settings`) | Light/dark appearance, default import currency, optional Personal Agent and consent for hosted AI, persisted settings and save feedback | UI_10; showcase dark mode; WhatsApp 10.48.32 and 10.48.33 |
| Personal Agent (`/agent`) | In-app financial Q&A, suggested prompts, deterministic facts, optional explicitly enabled hosted explanation, data-aware/unavailable states | UI_12; showcase desktop/mobile; WhatsApp 10.48.32 and 10.48.33 |
| Search results (global overlay or `/search`) | Search authorized overviews, transactions, categories, and merchants; show typed result groups and empty state | Showcase search results; global search across shell references |
| Merchant detail (e.g. `/spending/:merchantId`) | Transactions, category mix, period total/count/share for a selected merchant | Showcase merchant details; extend UI_11 table interaction |
| Transaction/statement states | Upload ready, processing, invalid/rejected, backend failure, no transactions, and recoverable retry states. Prefer explicit states within their owning route rather than unrelated stand-alone routes. | UI_02–04; showcase backend failure/no transactions/delete confirmation; WhatsApp 10.48.31 |

### Shared shell/components and design tokens

- **Brand:** Use `reference-images/spendsense Compass.png` as the logo asset; do not redraw it. Keep the wordmark and accessible alt text.
- **Application shell:** responsive top bar (logo, global search, settings, profile/past overview entry, Personal Agent entry) and sidebar navigation on wide screens; compact navigation/menu on narrow screens.
- **Reusable UI:** upload drop zone/file row, validation alert, loading/status panel, metric card, date range picker, table with sort/filter/empty states, category chip, chart card/legend, comparison selector/table, confirmation dialog, report preview/download control, agent message/prompt/composer, settings control, toast/inline error.
- **Tokens:** warm white/off-white page surfaces; dark navy text/icons; emerald/teal brand; pale green secondary surfaces; restrained gray borders/shadows; red error/expense semantics. Define tokens for typography, spacing, radii, borders, elevations, focus states, and chart/category palette. Maintain accessible contrast, visible keyboard focus, labels, and reduced-motion support.
- Keep the import surface visually simpler than the authenticated-looking app shell, while preserving consistent brand and button styles.

## 3. Proposed frontend architecture

No framework is installed or specified. If implementation is approved, use a maintainable TypeScript SPA (React + Vite is a practical default), a router with direct-link/refresh support, and a typed API client. Reassess this choice if a project stack or deployment constraint is supplied before implementation.

Suggested separation:

- `app/`: route definitions, providers, global error boundary, shell and navigation.
- `features/import/`, `overview/`, `transactions/`, `analytics/`, `spending/`, `compare/`, `reports/`, `history/`, `settings/`, `agent/`, `search/`: route-level UI and feature-specific state.
- `components/`: shared accessible controls, cards, tables, dialogs, charts, status and empty states.
- `lib/api/`: typed request/response models, API client, upload progress/cancellation, normalized error handling.
- `lib/format/`: display-only currency/date formatting; no authoritative financial aggregation.
- `styles/`: design tokens and light/dark themes.
- `public/assets/`: approved logo asset copied from the reference folder only if needed by the chosen build pipeline.

Use server responses as the source of financial truth. Frontend state holds filters, active analysis IDs, transient upload state, and persisted visual preferences; it must not independently recalculate totals for display.

## 4. Proposed backend architecture and data contracts

Use a Python API service (FastAPI is a practical default) with versioned JSON endpoints, explicit request/response models, service and repository layers, and a separate parsing/calculation domain layer. This is a proposed stack, not an assertion about existing code.

### Services/layers

1. API/auth boundary and request validation.
2. Upload validation and parsing service, isolated from HTTP handlers.
3. Normalization/classification service for transactions, merchants, categories, and source-format conventions.
4. Calculation/query service used by overview, analytics, merchants, comparison, report, and agent features.
5. Persistence repository with migrations; do not have UI routes talk directly to database/storage.
6. Report rendering/export service.
7. Personal Agent orchestration service using authorized, deterministic financial summaries; optional model provider only for language composition.

### Proposed API surface

- `POST /api/v1/imports` — multipart upload; validate and analyze; return structured status, issues/warnings, statement metadata, and analysis ID on success. Support progress by polling or a job status endpoint if parsing is asynchronous.
- `GET /api/v1/imports/{id}/status` — processing state, progress stage, or explicit error.
- `GET /api/v1/overviews/{id}` — selected-period summary and chart-ready aggregates.
- `GET /api/v1/transactions` — paginated, filtered, sortable records scoped to a saved analysis/period.
- `GET /api/v1/analytics` — date-scoped category, monthly, and top-category series.
- `GET /api/v1/merchants` and `GET /api/v1/merchants/{id}` — aggregates and transaction detail.
- `GET /api/v1/imports` — history list; `DELETE /api/v1/imports/{id}` — delete with ownership checks.
- `GET /api/v1/comparisons?left={id}&right={id}` — comparable period summaries, category changes, and denominator/missing-data flags.
- `POST /api/v1/reports` — generate a report/export from an analysis and selected period; return a short-lived authenticated download or stream response. `GET /api/v1/reports` may list recent report metadata.
- `GET/PUT /api/v1/settings` — read/update appearance, display currency, and agent preference.
- `POST /api/v1/agent/messages` — accept question/context IDs, retrieve authorized deterministic facts, return response and any supported citations/period context.
- `GET /api/v1/search?q=...` — search only the caller’s authorized saved data.

Return consistent error objects with machine-readable code, human-safe message, and field/row details when appropriate. Do not use success-shaped responses for parser or provider failures.

### Database entities and relationships

- **User** (only when real authentication is enabled): owner of private records/settings.
- **Import/StatementAnalysis:** owner ID, original filename for display, upload/analysis timestamps, statement period, parser/version, status, warnings, currency, source metadata; never store public file URLs.
- **Transaction:** import ID, date, description/raw merchant label, normalized merchant, category and classification confidence/source, normalized signed amount in minor units, original amount/currency when available, transaction type, source row/reference, duplicate fingerprint.
- **Category:** stable category code/name and optional user override mapping.
- **Merchant:** normalized merchant identity and aliases, related to transactions.
- **UserSettings:** theme, display currency, agent enabled state.
- **ReportRecord:** owner/import/period, format, creation time, expiry/storage reference if a private file is retained; otherwise metadata only.
- **AgentConversation/Message:** optional, owner-scoped, with retention policy; avoid storing full statement content in prompts/logs.

Use foreign keys and owner scoping for every user-owned lookup. Migrations and indexes should cover owner/import/date/category/merchant filters. Store money as integer minor units or exact decimal with currency scale; do not use binary floats.

### Persistence/configuration decision

The handwritten notes mention Supabase and environment-based credentials, but the workspace has no credentials or setup. Prefer a repository abstraction and migrations. A configured Supabase PostgreSQL deployment may be used when credentials and auth model are provided; secrets/service-role access stay backend-only. A local SQLite mode can support single-user development without external credentials, but must be explicitly labeled local-only and must not be represented as multi-user secure. Before implementation, confirm the hosted database/auth choice and how an authenticated user is established.

## 5. Data flow and behavior

### Upload, validation, and processing

1. User picks or drops a file; show name/type/size, allow replace/remove, and validate client-side for quick feedback only.
2. Send bytes to backend over HTTPS with request size limits. Enforce extension allowlist, magic/content checks, safe filename handling, file size limits, parser time/resource limits, and malware scanning where available. Do not trust client MIME or extension.
3. Parse formats individually (CSV, XLS/XLSX, text-based PDF only where parser quality is verified). Validate tabular structure and detect headers/mapping; require user confirmation when date/description/debit-credit mapping is ambiguous. Reject unrelated documents, empty statements, malformed rows, and unsupported/scanned PDFs with actionable errors.
4. Normalize source-specific debit/credit fields, dates, currency, duplicates, refunds/reversals, transfers, descriptions, and merchant/category. Preserve original source values/row references needed for traceability, with strict privacy controls.
5. Backend calculates/validates aggregates and reconciliations, then persists a successful analysis and normalized transactions atomically. On failure, do not create a successful history entry. Use bounded job status and retry/cancel behavior for long processing.
6. Return analysis ID and navigate to Overview only after the backend has succeeded. Show the processing state and explicit failure/no-transactions states.
7. Prefer deleting temporary raw uploads after parsing. If retaining originals is required later, use encrypted private object storage, owner authorization, retention policy, and confirmed deletion.

### Financial calculations and definitions

- Define one canonical convention per source mapping and normalize to signed transaction values with exact arithmetic. Record whether source amounts are debit/credit columns or signed values; do not guess ambiguous layouts.
- For a selected period, calculate income, expense, net flow (`income - expenses`), count, category totals, merchant totals, and monthly series in backend domain services. Separately store/display statement-reported opening/closing balance only when present. Never label calculated net flow as bank closing balance.
- Include/exclude transfers, refunds, reversals, duplicate rows, and pending entries according to documented deterministic rules; preserve traceability and flag uncertain classifications for user review.
- Category and merchant amounts must reconcile to the same transaction set. Define whether income/refunds are excluded from “spending” chart totals and use the same definition in overview, analytics, report, comparison, and Personal Agent.
- Date ranges should be inclusive/exclusive consistently, use statement-local dates, and avoid timezone shifts for date-only records.
- Percentage changes must handle zero baseline (report not comparable/undefined rather than divide by zero); missing categories count as zero only when the comparison coverage supports that interpretation.
- Currency setting formats displayed values. Do not convert transaction amounts without an explicit exchange-rate source, date policy, and user consent.
- Empty or insufficient-history screens show zero/empty labels and explain what is unavailable; never show reference screenshot amounts as production data.

### History, comparison, reports, and search

- Save successful import analyses and transaction records independently of current upload state. Reopen by analysis ID; deletion requires confirmation and cascades/archives according to an explicit retention policy.
- Comparison selects two saved analysis IDs, explains statement periods, reports income/expense/net/bank closing balance distinctly, transaction counts, category differences, and percentage denominator behavior.
- Report preview reads the same backend summary and categories as the dashboard. Generate PDF and CSV only from authorized data; validate export contents and report failures. Retain report metadata/recent downloads without exposing public URLs.
- Search backend applies authorization and bounded query/pagination; UI groups results by overview, transaction, merchant, and category. Never leak results across users.

### Personal Agent

- Require enabled preference and an authorized selected/imported data scope. If no analysis exists, prompt the user to import; if disabled/unconfigured, explain status and preserve all non-agent features.
- Parse a question into supported intent; fetch exact facts through the same backend calculation/query services used by the UI. Deterministic calculations establish totals, ranks, and percentages.
- An optional configured hosted language model may phrase grounded facts and suggestions. Send only minimum necessary, authorized, preferably aggregated context; keep credentials backend-side; enforce timeouts, rate limits, and safe response handling.
- Do not imply bank connectivity or invent access/data. If the backend/model fails or facts are insufficient, return a clear limitation and a safe next step. Never let model instructions select another owner’s data or override authorization.

## 6. Security and privacy requirements

- HTTPS in deployment; strict backend request/body limits; file allowlist and content verification; safe temporary-file handling; parser isolation/resource/time limits; rate limiting and CSRF protections where cookie auth is used.
- Authentication/authorization before any multi-user release. Enforce owner scoping server-side for imports, transactions, reports, search, settings, and agent context; verify isolation in tests. Use Supabase RLS only as defense-in-depth if configured, not as a substitute for API checks.
- Store secrets only in backend environment/secret manager; provide a placeholder-only `.env.example` if implementation is approved. Never expose database service-role keys to browser or logs.
- Do not log statement bytes, full descriptions, credentials, or agent context. Redact errors and set retention/deletion rules for raw files, generated reports, conversations, and backups.
- Private object storage only if needed, short-lived access links, least-privilege database role, encryption at rest, secure headers/CSP, dependency updates, and audit of sensitive actions.
- Local SQLite mode, if implemented, is a single-user development option only. Clearly document that it does not provide production multi-user isolation/authentication.

## 7. Testing and acceptance strategy

### Automated tests

- **Parser tests:** valid/invalid CSV and Excel structures, encoding, missing/duplicate headers, bad rows/dates, debit-credit variants, malformed and unrelated PDFs, empty/scanned PDFs, size/type mismatches, and parser timeouts.
- **Financial domain tests:** signed amounts, income/expense, transfer/refund/reversal policies, duplicate handling, currency precision, category/merchant reconciliation, period boundaries, statement balance versus net flow, zero-denominator comparisons, and missing categories.
- **API/integration tests:** upload success/failure lifecycle, atomic persistence, history reopen/delete, transaction filters/sorting/pagination, analytics, merchant detail, comparison, report authorization/download, settings persistence, search, and agent grounding/unavailable cases.
- **Security tests:** unauthorized access, cross-user IDOR attempts, owner isolation, upload limits/content spoofing, path/filename traversal, secret redaction, rate limits, and private download handling.
- **Frontend tests:** route links, form and drop-zone accessibility, keyboard-only flows, upload/remove/replace/error/retry/loading states, filters/sort, empty state, settings, confirmation dialogs, report actions, agent disabled/error states, and responsive navigation.
- **Visual tests:** compare key desktop/mobile routes to references using stable test fixtures; verify theme and contrast. Fixtures are synthetic and never production defaults.
- **End-to-end:** import a known supported test statement -> backend validates -> overview totals reconcile to transactions -> history reopens same analysis -> compare two saved imports -> preview/download report -> search -> ask agent a question grounded in same totals -> delete with confirmation.

### Acceptance criteria

- All primary sidebar/header buttons navigate or perform a visible action; no dead controls.
- Backend and UI totals reconcile, remain consistent across routes, and use exact money arithmetic.
- Invalid/unrelated uploads cannot create a successful import or misleading dashboard.
- A successful import appears in history and can be reopened; deleting it requires confirmation and removes access to dependent records.
- Comparison, search, report, and agent operations are scoped to authorized records and clearly handle missing/insufficient data.
- UI retains recognizable SpendSense branding and responsive reference layout without shipping hardcoded reference finances.

## 8. Ordered implementation phases

1. **Approval and decisions:** approve audit/plan; confirm hosted Supabase/auth requirements, deployment target, statement examples/known formats, upload limits, retention policy, and whether a mobile package is in scope.
2. **Foundation:** establish frontend/backend project structure, environment/config validation, API contracts, design tokens, shared shell, logo asset use, migrations, and local single-user dev mode. Add health checks and baseline lint/type/test commands.
3. **Domain and persistence:** define transaction/import/settings/report entities; implement exact-money domain calculations and migration/repository tests before wiring charts.
4. **Import pipeline:** file picker/drop zone; server-side format/content/structure validation; CSV/XLSX parsers and verified PDF support; processing/status/error/retry; atomic persistence and import tests.
5. **Overview and history:** data-driven dashboard, empty/no-transactions states, saved history/reopen/delete confirmation, date filters, and overview reconciliation tests.
6. **Transactions and analytics:** paginated/filterable/sortable transaction view; category/month charts and breakdowns; individual merchant spending/details. Validate all aggregations against fixtures.
7. **Compare and reports:** statement selection/comparison edge cases; report preview; PDF/CSV generation and recent download metadata; access-control and export tests.
8. **Settings and global search:** persisted theme/currency/agent toggle, responsive shell, grouped authorized search, keyboard/a11y and visual tests.
9. **Personal Agent:** deterministic fact retrieval first; optional backend model provider only after configuration/privacy approval; grounded-answer, disabled, no-data, and failure tests.
10. **Hardening and release readiness:** run full unit/integration/e2e/security/accessibility/visual tests; validate responsive desktop/tablet/mobile web; document setup, environment variables, limitations, deployment, backups, and retention. Do not claim production readiness until authentication, authorization, and isolation have been implemented and verified.

### Dependencies and gates

- Every UI feature depends on its API contract and backend data model; chart pages should not be built against mock financial totals as if they were final.
- Upload parsing/domain correctness and persistence precede overview, analytics, comparison, report, and agent implementation.
- Authentication/owner isolation must be settled before enabling shared or hosted multi-user data.
- Personal Agent model integration and mobile packaging are optional gates; neither should delay core upload-to-overview functionality.
