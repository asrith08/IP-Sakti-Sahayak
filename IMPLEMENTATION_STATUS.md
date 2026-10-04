## Phase 2 — Architecture Decision

### 0. UI Preservation Rule
**Existing UI is frozen unless explicitly requested otherwise.**
Phase 3 must not redesign pages, layouts, colors, typography, spacing, navigation, components, routes, or animations. Backend functionality should be added underneath the existing interface.

### 1. Facts discovered from repository
**REPOSITORY FACT**
- The repository contains a React application built with Vite, TypeScript, Tailwind CSS, and React Router‑like custom routing.
- All UI logic, routing, and state management are located in `src/main.tsx`, `src/App.tsx`, `src/lib/router`, and the `src/views` directory.
- The application currently uses a **mock API client** (`src/lib/api`) that returns pre‑built responses and a dynamic builder for an `AnalyzeResponse` contract.
- A PDF generation layer (`src/lib/pdf`) exists that uses `jsPDF` to render compliance checklists and dossiers.
- `package.json` includes dependencies such as `express`, `@google/genai`, `jspdf`, and development tooling for Vite and TypeScript.
- Supabase is referenced via an `.env.example` that defines `GOOGLE_API_KEY` and `APP_URL`, but no Supabase client code is present in the current repo.
- No backend/server code exists beyond the unused `express` dependency and the client‑side mock implementation.
- The README mentions setting `GEMINI_API_KEY` in `.env.local` and running the app with `npm run dev`.
- Environment variable names identified: `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `APP_URL`.
- The API contract is defined in `src/types/api.ts` (with `AnalyzeRequest`, `AnalyzeResponse`, etc.).
- No existing authentication flow or protected routes are implemented; all endpoints are public.
- The application already handles session persistence via `sessionStorage` and `localStorage` for analysis results and checklist overrides.

### 2. Architecture options evaluated
**CURRENT ARCHITECTURE DECISION**
- **Option A**: React/Vite + separate backend API (Node/Express, Hono, etc.)
- **Option B**: React/Vite + Supabase Edge Functions
- **Option C**: React/Vite + other serverless backend (Vercel Functions, Netlify Functions, Cloudflare Workers)
- **Option D**: React/Vite + colocated Node backend (same repo, develop concurrently)
- **Option E**: Migration to a full‑stack framework (Next.js, Remix, etc.)

### 3. Recommended architecture
**CURRENT ARCHITECTURE DECISION**
**Option A**: React/Vite + separate backend API (Node/Express).
This keeps the existing UI intact and provides full control over authentication, AI orchestration, vector storage, and RLS.

### 4. Why it was selected
**CURRENT ARCHITECTURE DECISION**
- **Compatibility with existing frontend**: The current code expects `/api/v1/...` endpoints; a dedicated backend can expose this contract without touching the front‑end.
- **Explicit control over secrets**: A backend can store API keys (Gemini, NVIDIA NIM) in environment variables, isolated from the browser.
- **Scalable and observable**: A separate service can be containerized, deployed to a cloud platform, and instrumented with logs, metrics, and error tracking.
- **Clear separation of concerns**: Backend handles authentication, business logic, AI integration, and audit logging; frontend focuses on UI and local state.
- **Future extensibility**: New providers (Gemini, NVIDIA NIM, vector stores) can be added as separate modules without impacting the UI.

### 5. Browser responsibilities
**FUTURE IMPLEMENTATION DECISION**
- User interface: React components, routing, styling.
- Form input and client‑side validation.
- Session persistence via Supabase client SDK (JWT storage).
- Authenticated request signing (Supabase JWT in `Authorization` header).
- Result visualization and PDF generation (client‑side with `jsPDF`).
- Checklist UI, status toggling, and local persistence in `sessionStorage` / `localStorage`.
- Language selection and local‑storage of preferences.
- Client‑side error handling and retry logic for transient failures.

### 6. Server responsibilities
**CURRENT ARCHITECTURE DECISION**
- **Authentication & Authorization**: Verify Supabase JWT for protected routes; enforce Row‑Level Security (RLS) for user‑scoped data; privileged service‑role operations only for trusted server‑side tasks.
- **AI orchestration**: Route requests to Gemini, NVIDIA NIM, or other providers based on configuration; handle token budgeting, context limits, and prompt templates.
- **RAG orchestration**: Source discovery → ingestion → parsing → normalization → metadata extraction → chunking → embedding → vector storage → retrieval → optional reranking → evidence selection → LLM analysis → claim/citation validation → final decision‑support response.
- **Regulatory / business rules**: Apply deterministic logic for classification and compliance decisions.
- **Evidence selection & citation validation**: Track source ID, canonical URL, document version, publication date, ingestion timestamp, location, chunk ID, evidence text, claim‑to‑evidence relationship, jurisdiction, source authority/trust level.
- **Persistence orchestration**: Persist analyses, requests, evidence, citations, checklists, regulatory changes, and audit logs.
- **Audit logging, rate limiting, provider retries, safe error handling, and server‑side secrets**: Store secrets in environment variables; isolate the Supabase service‑role key; never expose Gemini or NVIDIA keys to the browser.

### 7. Supabase responsibilities
**CURRENT ARCHITECTURE DECISION**
- **Authentication**: Email/password signup, login, password reset, JWT issuance.
- **User‑owned profile**: An application‑owned `profiles` table is created if needed; it is **not** a Supabase default table.
- **Auth users**: Supabase `auth.users` is managed by Supabase Auth and contains the authenticated user records.
- **Row‑Level Security**: Policies that allow a user to read/write only their own analyses and related data.
- **Service‑role key**: Bypasses RLS; **must not** be protected by RLS; must only be used in trusted server‑side contexts.
- **Database tables** (planned, not yet created): `analyses`, `analysis_requests`, `sources`, `documents`, `document_chunks`, `evidence`, `citations`, `checklists`, `regulatory_changes`, `audit_logs`.
- **Vector storage**: Supabase PostgreSQL + pgvector for initial implementation; abstraction kept for future external vector DB.

### 8. AI / Provider architecture
**CURRENT ARCHITECTURE DECISION**
- Separate provider interfaces are defined for:
  - **LLM / reasoning**
  - **Embeddings**
  - **Retrieval**
  - **Reranking**
  - **Guardrails / safety**
- Gemini and NVIDIA services remain behind these abstractions; the application does not hard‑code any single provider.

### 9. RAG architecture
**CURRENT ARCHITECTURE DECISION**
1. **Source Discovery**
2. **Document Ingestion**
3. **Parsing**
4. **Normalization**
5. **Metadata Extraction**
6. **Chunking**
7. **Embedding**
8. **Vector Storage** – Supabase PostgreSQL + pgvector (initial target).
9. **Retrieval**
10. **Optional Reranking**
11. **Evidence Selection**
12. **LLM Analysis**
13. **Claim/Citation Validation** – track source ID, URL, version, date, ingestion timestamp, location, chunk ID, evidence text, claim‑to‑evidence relation, jurisdiction, authority/trust level.
14. **Final Decision‑Support Response**

#### Source Trust Hierarchy
**CURRENT ARCHITECTURE DECISION**
- **Tier 1**: Official government, regulatory, statutory sources and authoritative official publications.
- **Tier 2**: Official institutional databases and recognized authoritative repositories.
- **Tier 3**: Secondary professional/reference material.
- **Tier 4**: Unverified/general web content.
The system prefers higher‑authority sources and explicitly exposes uncertainty when higher‑authority evidence is unavailable. For TKDL / traditional‑knowledge evidence, the system never fabricates or infers unavailable records; if authoritative evidence is unavailable, it returns an `INSUFFICIENT_EVIDENCE` or `HUMAN_REVIEW_REQUIRED` state.

#### Decision‑Support States
**CURRENT ARCHITECTURE DECISION**
The final evidence/analysis layer supports the following states as first‑class outcomes:
- `SUPPORTED`
- `PARTIALLY_SUPPORTED`
- `INSUFFICIENT_EVIDENCE`
- `CONFLICTING_SOURCES`
- `HUMAN_REVIEW_REQUIRED`

### 10. API boundary
**CURRENT ARCHITECTURE DECISION**
| Endpoint | Purpose | Auth | User‑scoped? | Persists data? |
|---|---|---|---|---|
| `GET /api/v1/health` | Health check (status, latency) | N/A | N/A | No |
| `POST /api/v1/analyze` | Submit an analysis request | Yes (Supabase JWT) | Yes | Yes (analysis request stored) |
| `POST /api/v1/classify` | Classify a regulation or content | Yes | Yes | Yes |
| `POST /api/v1/evidence` | Record evidence for an analysis | Yes | Yes | Yes (evidence entries) |
| `GET /api/v1/analysis/:id` | Retrieve a past analysis | Yes | Yes (ownership enforced) | No |
| `GET /api/v1/checklist/:id` | Get checklist for an analysis | Yes | Yes (ownership enforced) | No |
| `POST /api/v1/checklist/:id/item/:itemId` | Update checklist item status | Yes | Yes | Yes (updates checklist item) |
| `GET /api/v1/regulatory-changes` | List latest regulatory changes | Yes | No | No |
| `GET /api/v1/sources` | List available regulatory sources | Yes | No | No |
| | | | | |
**Notes**: Only `/api/v1/health` is publicly accessible. All other endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header. Endpoints may be implemented progressively; the API boundary is defined for future implementation.

### 11. Database entities
**FUTURE IMPLEMENTATION DECISION**
- `profiles` – application‑owned table; **planned**.
- `analyses` – id, user_id, request_id, status, timestamps, classification, answer, claims, evidence, citations, checklist, next_steps.
- `analysis_requests` – id, user_id, request, created_at.
- `sources` – id, name, jurisdiction, type, url, updated_at.
- `documents` – id, source_id, file_path, metadata, published_at.
- `document_chunks` – id, document_id, chunk_text, embedding vector, start_offset, end_offset.
- `evidence` – id, analysis_id, evidence_item.
- `citations` – id, analysis_id, citation_item.
- `checklists` – id, analysis_id, checklist_item.
- `regulatory_changes` – id, jurisdiction, change_type, description, effective_date.
- `audit_logs` – id, user_id, action, entity, entity_id, timestamp, details.
No migrations have been applied; these are planned.

### 12. Security architecture
**CURRENT ARCHITECTURE DECISION**
- **Browser**: Never expose API keys; use Supabase client for auth.
- **Server**: Store all secrets in environment variables; use a secrets manager.
- **Auth**: Supabase JWT; verify via middleware; enforce RLS.
- **Row‑Level Security**: Policies allow a user to read/write only their own analyses and related data.
- **Service‑role key**: Bypasses RLS; **must not** be protected by RLS; must only be used in trusted server‑side contexts.
- **Input validation**: Sanitize incoming JSON; reject malformed payloads.
- **Rate limiting**: Apply per‑user limits on `/analyze`.
- **Audit logging**: Record every create/update/delete on analyses, requests, and checklists.
- **Prompt injection protection**: Escape user input; use prompt templates.
- **Document safety**: Validate PDFs for malicious content before ingestion.
- **CORS**: Serve backend from same origin or configure CORS for cross‑origin calls.

### 13. Deployment architecture
**CURRENT ARCHITECTURE DECISION**
- **Frontend**: Vite static build → deploy to static hosting (Cloudflare Pages, Netlify, Vercel, S3+CloudFront). HTTPS; configure CORS if needed.
- **Backend**: Node/Express service; containerized; deploy to Cloud Run, App Engine, Azure App Service, Fly.io, Render, or Kubernetes. Environment vars for secrets; keep service‑role key isolated.
- **Supabase**: Hosted on Supabase Cloud; Postgres with vector extension; create RLS policies.
- **CI/CD**: GitHub Actions to run tests, lint, build, deploy to staging/production.
- **Observability**: Logs, metrics (Prometheus+Grafana or Stackdriver), error tracking (Sentry).

*These are target architectures; no mandatory dependencies are committed yet.*

### 14. Implementation dependency order
**FUTURE IMPLEMENTATION DECISION**
- **Phase 3A**: Backend/API contract and project skeleton.
- **Phase 3B**: Supabase Auth + database foundation + RLS.
- **Phase 3C**: Connect the existing frontend to authenticated backend APIs while preserving the current UI.
- **Phase 3D**: AI/provider abstraction layer.
- **Phase 3E**: Classification and deterministic regulatory/business rules.
- **Phase 3F**: RAG ingestion + pgvector + retrieval + evidence model.
- **Phase 3G**: LLM synthesis + citation validation + decision states.
- **Phase 3H**: Checklist / next‑step planner / regulatory change intelligence.
- **Phase 3I**: Audit logging, security hardening, error handling, evaluation and tests.
- **Phase 3J**: Deployment and production configuration.

### 15. Architecture decisions
**CURRENT ARCHITECTURE DECISION**
- Keep React + Vite front‑end unchanged; serve statically.
- Separate Node/Express backend providing `/api/v1` contract.
- Use Supabase for auth, DB, and RLS; vector store via Supabase vector extension or external.
- AI abstraction layer to decouple provider choices.
- Background jobs via a job queue (Bull/Agenda) for ingestion and monitoring (planned).

### 16. Decisions that remain unresolved
**UNRESOLVED DECISION**
- Provider selection (Gemini model version, NVIDIA NIM embeddings) – cost vs. performance.
- Vector index scaling – Supabase vector extension vs. external service.
- Regulatory change monitoring – frequency and source polling.
- User notifications/webhooks for new evidence or regulatory changes.
- Audit log schema granularity.

PHASE 1 — REPOSITORY AUDIT: COMPLETE
PHASE 2 — ARCHITECTURE DECISION: COMPLETE
PHASE 3 — IMPLEMENTATION: NOT STARTED

PHASE 3B — SUPABASE FOUNDATION: COMPLETE

- Environment variable names: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
- Supabase clients created: src/lib/supabase/browser.ts, server/supabase.ts
- Migration file created: supabase/migrations/20231004_create_supabase_schema.sql
- Tables created: profiles, analysis_requests, analyses, checklists
- RLS policies created for each user-owned table
- Trigger created to auto-create a profile on new auth.users
- Backend auth middleware foundation: server/middleware/auth.ts
- Validation performed: typecheck passes, Vite build passes, backend starts locally, migration SQL is syntactically valid.
- Remote Supabase migration application status: NOT APPLIED.
- No frontend UI files were modified.


PHASE 3A — BACKEND/API SKELETON: COMPLETE

- Files created/modified:
  - server/app.ts
  - server/index.ts
  - server/routes/health.ts
  - .env.example
  - package.json (scripts section updated)
- Backend start command:
  - npm run dev:api
- Backend port: 4000 (default, can be overridden via PORT env var)
- Health endpoint:
  - GET /api/v1/health → { status: "ok", service: "ip-sakti-sahayak-api" }
- Validation performed:
  - Typecheck (tsc --noEmit) passes.
  - Vite build passes (frontend unchanged).
  - Backend starts with npm run dev:api and responds at http://localhost:4000/api/v1/health with HTTP 200 and expected JSON.
  - No frontend UI files were modified; visual and functional behavior preserved.
  - Authentication, database, AI, RAG, Gemini, NVIDIA, regulatory intelligence are not yet implemented.