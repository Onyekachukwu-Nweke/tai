# Local development

TAI uses a React client served by one Hono Worker, Better Auth with Google, and local D1. This preview supports study spaces, browser extraction, private source storage, concepts, activity packs, deterministic MCQ checks, saved practice interactions and study-space deletion. Model grading and live AI are not implemented yet. Use synthetic data during development.

## Prerequisites and commands

Use Node.js 24.21.0 (`nvm use`) and npm 11.21.0 (`npm install --global npm@11.21.0` if needed). Exact dependency versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open `http://localhost:8787`. The development command builds the client and serves it through Wrangler; restart it after client edits. D1 is persisted locally in the ignored `.wrangler` directory. The `ORIGINALS` R2 binding is emulated locally alongside D1. No Cloudflare account or remote resource is required locally. Without OAuth configuration, the app reports that sign-in is unavailable; there is no guest or development-login bypass.

For client hot reload, run `npm run dev:web` alongside Wrangler, set `APP_ORIGIN` to `http://localhost:5173` in `.dev.vars`, and use that origin in the browser and Google OAuth configuration. The Vite server proxies `/api` to Wrangler. Restart Wrangler after changing its variables.

## Google sign-in

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate a secret with `openssl rand -base64 32` and set `BETTER_AUTH_SECRET` locally.
3. Configure a Google OAuth web client and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` locally. Never paste secrets into source files or chat.
4. Register `http://localhost:8787/api/auth/callback/google` as the authorized redirect URI (or port 5173 when using hot reload).
5. Restart Wrangler and use **Continue with Google**.

The [Better Auth Google setup guide](https://better-auth.com/docs/authentication/google) describes provider registration. Real provider login needs your OAuth configuration; synthetic integration tests do not prove that external OAuth is ready.

Production requires an explicit HTTPS `APP_ORIGIN`, Worker secrets, a real D1 database ID and matching Google callback URI. `wrangler.toml` deliberately contains a local placeholder database ID. Do not treat the checked-in file as deployed infrastructure. This work does not provision or deploy cloud resources.

Sessions have a fixed seven-day lifetime with no cookie cache or rolling renewal. Expired sessions require Google sign-in again. Optional avatars, IP/user-agent metadata, and OAuth access/refresh/ID tokens are not retained.

## Verification

```sh
npx playwright install chromium
npm run check
```

This runs formatting, ESLint, TypeScript, the 350-line authored-code check, local Markdown file-link validation, Vitest in the Workers runtime, Playwright browser tests with mocked APIs, the Vite production build, and a Wrangler dry-run bundle. Individual scripts are in `package.json`. Use `npm run format` to format application/tooling files. Existing planning Markdown is excluded from bulk formatting to avoid unrelated rewrites.

Tests use local D1 migrations and synthetic sessions with the actual auth implementation. The fake concept adapter is internal test infrastructure and makes no network or billed model calls. There is no fake educational-content endpoint or production test-login route.

The concept explorer currently uses that deterministic fake adapter through authenticated concept routes. The interface labels its output as an unreviewed development preview. This proves owner-scoped chunk retrieval, citation validation, persistence, editing, retry and source navigation; it does not establish concept quality or live-model readiness.

The activity-pack preview also uses a deterministic fake adapter. An explicit request sends only a request UUID; the Worker loads selected concepts and chunks and validates a canonical 3–5 question pack. The authenticated DTO carries bounded recall and MCQ review keys for local checking, but the interface hides them until submission or deliberate reveal and never writes them to browser storage. Attempts persist before acknowledgment; failed saves keep a user-scoped draft for explicit retry. Explanations are saved ungraded. Run `npm run db:migrate` after pulling migrations, including `0005_activity_attempts.sql`.

The link checker checks relative Markdown file targets, not anchors or remote URL availability. Generated `dist`, installed dependencies, and Wrangler state are excluded from authored-code checks. Playwright covers browser behavior with mocked API responses; full browser-to-Worker OAuth and low-end device extraction tests remain future work. On Linux, use `npx playwright install --with-deps chromium` if browser system dependencies are missing.

## Local material previews

Create a study space and choose **Preview material**. Select a text-based PDF or UTF-8 TXT file. Until **Save material** is selected, the original and extracted text remain in tab memory. Saving stores the original in private R2 and validated extracted content in D1. Saved material reopens from the account after reload. One immutable material is allowed per space; create a new space for another file. No AI request is made during saving. A failed save retains the matching original and preview for explicit retry with the same document ID.

Limits are 10,000,000 bytes (decimal 10 MB), 50 PDF pages, 500,000 extracted UTF-16 characters, and 500 chunks. PDF parsing uses a lazy-loaded, locally bundled PDF.js worker. Chunk offsets refer to normalized extracted section text, not PDF byte positions. Password-protected, unreadable, textless, or oversized material is rejected with explicit recovery guidance. English support is disclosed; language detection is not implemented.

Always compare equations, symbols, tables, and reading order with the original. Extraction is not verification of meaning or correctness. A saved PDF can be rendered one page at a time in the browser after the learner explicitly opens the reader; the original is fetched through the authenticated route and is not converted to persistent page images. The extracted-text alternative remains visible and is the canonical source for chunks and citations. TXT remains text-only. The preview shows one page/section at a time, capped at 20,000 visible characters, with a truncation notice. Device testing remains an open roadmap gate. The Worker independently checks original size/type, TXT text, and PDF structure/page count; PDF text fidelity still requires learner inspection.

Synthetic fixtures are reproducible with `node scripts/generate-material-fixtures.mjs`. Real PDF.js extraction runs in the browser tests; pure file validation/chunking rules run with Vitest.

## Implementation layout

- `apps/web`: React interface and client request handling.
- `apps/worker`: Hono routes, session resolution, ownership and request validation.
- `packages/contracts`: versioned boundary schemas.
- `packages/adapters`: internal fake AI adapter.
- `migrations`: auth and versioned application tables for spaces, materials, concepts, packs and attempts.
- `tests`: synthetic contracts and Worker/D1 integration checks.

A study-space ID is not authorization. The Worker resolves the session and scopes data access to its user ID. Authentication requires multiple library-owned tables; the roadmap's initial “one table” means one **application** table, alongside auth tables in the same D1 database.

The `sharp` override pins 0.35.5 to resolve the transitive librsvg advisory in Cloudflare local tooling. Revisit the override when upstream Miniflare updates its dependency. npm 11 is pinned because npm 10 failed while resolving the current test-tool peer dependencies.

## Storage and deletion

Run `npm run db:migrate` after updating the checkout. Wrangler emulates private R2 locally; remote deployment requires provisioning the `tai-originals` bucket and D1. These changes do not provision resources. Original downloads require ownership checks and return attachments.

Uploads reserve an immutable object key before writing R2 and commit content only while the space is active. Retries compare document ID and payload fingerprint. Study-space deletion denies material reads immediately, then removes originals and material rows. An in-flight writer or cleanup failure returns pending deletion; the UI offers explicit retry and does not claim success. No reconnect replay, queue, or background cleanup is installed.

A hard-terminated Worker can leave an unsettled upload reservation. It stays tracked rather than permitting another writer or claiming deletion complete. For local development only, use the stopped-Worker recovery procedure below. Remote operational reconciliation remains unverified; a timeout alone does not prove that no late write can occur. Account deletion is not implemented in this slice.

The pinned pdf-lib 1.17.1 parser needs a privacy patch: upstream warnings include document-controlled numeric tokens. `scripts/patch-pdf-lib.mjs` checks exact source hashes and replaces those warnings with fixed-message rejection. `postinstall`, `pretest`, and `prebuild` apply it; do not bypass lifecycle scripts for a deployment build. Browser PDF.js is unaffected. Review this patch when upgrading pdf-lib. Server PDF validation checks structure/page count, not extracted-text fidelity, and complex compressed PDFs still need deployed CPU/memory evaluation.

### Recover an interrupted local import

Stop **every** Wrangler process using this checkout's local store, including processes in other terminals. Then run:

```sh
npm run materials:recover -- --local --confirm-worker-stopped
```

This command deletes originals tracked by unsettled local import records and changes those records to retryable failures. It never touches ready materials or remote storage. If an R2 deletion fails, its ledger remains for another explicit run. Restart Wrangler and retry the original upload or pending deletion in the UI. The command requires your acknowledgement that writers are stopped; it cannot establish quiescence for you. Do not run it while the app is serving requests. Remote recovery needs a separate, verified maintenance procedure.
