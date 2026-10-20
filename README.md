# SpendSense

SpendSense is a responsive, local single-user statement-analysis application. It includes a React/TypeScript/Vite frontend and a FastAPI backend with SQLite for local development and optional PostgreSQL support. Financial calculations and persistence are performed in the backend; the frontend does not ship example balances as live data.

## Requirements

- Node.js 20+ and npm
- Python 3.11+

## Run locally

1. Install the backend dependencies and launch its API:

   ```powershell
   python -m pip install -r backend\requirements.txt
   python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. In a second terminal, install and start the frontend:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

3. Open `http://127.0.0.1:5173`. The API health endpoint is `http://127.0.0.1:8000/api/health`.

The Vite development server proxies `/api` requests to the local FastAPI server. In production, the frontend uses relative `/api` URLs and FastAPI serves the built `dist/` files on the same origin.

## Deploy one Render web service

The root `render.yaml` configures a single Docker-based web service. Render builds the existing Vite production frontend in the Docker build stage, installs the backend requirements, and starts Uvicorn on Render's `PORT`. `/api/health` is the service health check. No deployment or external service changes are performed by these repository files.

Set optional provider/database values in the Render service's environment settings; do not commit `.env` or include secrets in the Docker build context. The existing `DATABASE_URL`, `DATABASE_PATH`, Groq, and AI variable names are unchanged. Render's local filesystem is ephemeral unless a persistent disk is attached. For durable storage, configure PostgreSQL through `DATABASE_URL` or explicitly configure a persistent disk and place `DATABASE_PATH` on its mount path. This setup does not copy or migrate existing SQLite data.

The Docker image can also be built and run locally with:

```powershell
docker build -t spendsense .
docker run --rm -p 8000:10000 -e PORT=10000 spendsense
```

The container starts with `python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}`. Render supplies `PORT` automatically.

The local SQLite database is created at `backend/spendsense.db`. It contains private imported transaction data; do not commit it. The application has no authentication and is for local, single-user development only. Do not expose the API or database to a network or deploy as a multi-user service without implementing and verifying authentication, authorization, isolation, HTTPS, and production storage/retention controls.

For a new setup, copy `.env.example` to the root `.env` only if `.env` does not already exist; do not overwrite existing local configuration. The backend resolves `.env` from the project root, independent of the shell's working directory. Keep `.env` private and never commit it. Missing AI credentials and an empty `DATABASE_URL` are supported; local development uses SQLite.

### Backend configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `./backend/spendsense.db` | SQLite file path, relative to the project root. The default preserves the existing local database location. |
| `DATABASE_URL` | empty | Optional PostgreSQL connection URL. Use a Supabase PostgreSQL URL with TLS; if no `sslmode` is provided, `sslmode=require` is added. |
| `MAX_UPLOAD_BYTES` | `10485760` | Maximum uploaded statement size in bytes. |
| `FRONTEND_ORIGIN` | `http://127.0.0.1:5173` | Allowed frontend origin for CORS (the local `localhost:5173` origin is also allowed). |
| `GROQ_API_KEY` | empty | Optional Groq credential, only used by the backend. |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | HTTPS Groq OpenAI-compatible API base URL. |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Configurable Groq chat model. |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | empty / OpenAI-compatible defaults | Backward-compatible hosted-provider configuration, used when no Groq key is configured. |

Obtain a Groq key from the Groq console, then set `GROQ_API_KEY` in the root `.env`. Never put provider credentials in Vite variables, frontend code, local storage, logs, or issue reports. Groq is only used when a user has enabled hosted AI in Settings. Without a key, the Personal Agent uses its deterministic local responses. On hosted calls, the backend sends the question and compact statement aggregates, not uploaded statements or raw transaction rows; do not enable hosted AI unless you accept this disclosure to the configured provider. Authentication, rate-limit, timeout, malformed-response, and outage failures return a safe notice and use the deterministic fallback.

### Supabase PostgreSQL (optional)

Set `DATABASE_URL` to the Supabase project's PostgreSQL connection string (prefer its pooler URL for hosted environments). Keep the password in `.env` or a secret manager and require TLS. With `DATABASE_URL` empty, SQLite remains in use. PostgreSQL schema initialization is automatic, but **existing SQLite data is never uploaded or migrated**. The first PostgreSQL run creates an empty schema. Changing `DATABASE_PATH` also selects a different SQLite file; back up and verify database paths before changing it. For production data transfer, use a separately reviewed export/import process, reconcile import/transaction counts and totals on the target, retain the untouched source database as rollback, and do not run such a migration without explicit authorization.

Manual Supabase setup: in the Supabase dashboard, open **Project Settings → Database → Connection string**, choose a PostgreSQL URI suitable for the backend's network location (the session pooler is appropriate when direct connections are unavailable), and place it in the root `.env` as `DATABASE_URL`. Keep the password private and do not use a browser/Vite variable. Allow network access from the backend host if the project restricts database connections. Starting the backend initializes only the SpendSense tables in the selected database; it does not copy SQLite data or enable Supabase Auth/RLS.

To check PostgreSQL connectivity safely, start the backend with a configured `DATABASE_URL` and call `/api/health` only after startup completes. Startup initializes the schema, so this checks that the configured database is reachable; do not paste the URL into commands or logs. An empty URL exercises local SQLite. No Supabase connection is claimed unless this succeeds against your project.

Before any public multi-user launch, add and verify authentication, authorization, per-user data isolation, a least-privilege database role, and a deliberate RLS policy strategy. The current single-user API has no user identity boundary; enabling RLS alone will not provide safe application-level isolation and may prevent its direct database access.

To verify Groq without spending credits, use the mocked backend tests. A real provider check requires an explicit hosted-AI opt-in and an agent question, uses one API request, and may consume credits/rate limits; no live request is made by the tests.

## Statement support and limitations

- CSV with recognizable date, description/narration, and amount or debit/credit columns.
- XLSX files with those recognizable columns.
- Text-based PDF statements where transaction rows can be reliably extracted as a date, description, and final amount.
- Legacy `.xls`, scanned PDFs/OCR, and bank-specific layouts that do not match supported structures are rejected with an explanation. Support is not universal. If amount semantics or columns are ambiguous, verify the exported statement columns instead of relying on guessed mappings.
- The selected currency (default from Settings) is assigned to an import; check it matches the statement before processing. Identical file bytes cannot be imported twice. Exact duplicate transaction rows within an imported file are skipped with a warning.
- Transactions use decimal arithmetic. Positive signed amounts count as income, negative amounts as expenses; transfers are excluded from income/expense totals. Amount columns without explicit transaction type are treated as signed. This deterministic convention cannot infer every bank's semantics.
- “Net cash flow” is calculated income minus expenses and is not the same as a bank-reported closing balance. INR, USD, EUR, and GBP can be selected as the statement currency. SpendSense does not infer exchange rates or convert transaction amounts; comparisons across different currencies are rejected.

## Test and build

```powershell
python -m pytest -q backend\tests
npm.cmd test
npm.cmd run build
```

Tests use temporary SQLite databases and mocked AI responses; they do not connect to Supabase or Groq. Use synthetic test data only. Never put API keys or real financial data in source control. SpendSense remains a local single-user application without authentication; do not expose it as a multi-user service without adding and validating authentication, authorization, tenant isolation, HTTPS, and production retention controls.

## Reference documents

- `REFERENCE_AUDIT.md` documents all supplied visual references.
- `IMPLEMENTATION_PLAN.md` records the proposed architecture and implementation order.
