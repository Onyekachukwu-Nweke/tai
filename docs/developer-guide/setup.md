# Local development

M0 introduces a React client served by one Hono Worker, Better Auth with Google, and local D1. This preview supports creating/listing study spaces and previewing PDF/TXT extraction in the browser. Uploads, deletion, learning activities, and live AI are not implemented yet. Use synthetic data during development.

## Prerequisites and commands

Use Node.js 24.21.0 (`nvm use`) and npm 11.21.0 (`npm install --global npm@11.21.0` if needed). Exact dependency versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open `http://localhost:8787`. The development command builds the client and serves it through Wrangler; restart it after client edits. D1 is persisted locally in the ignored `.wrangler` directory. No Cloudflare account or remote resource is required for this local shell. Without OAuth configuration, the app reports that sign-in is unavailable; there is no guest or development-login bypass.

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

The link checker checks relative Markdown file targets, not anchors or remote URL availability. Generated `dist`, installed dependencies, and Wrangler state are excluded from authored-code checks. Playwright covers browser behavior with mocked API responses; full browser-to-Worker OAuth and low-end device extraction tests remain future work. On Linux, use `npx playwright install --with-deps chromium` if browser system dependencies are missing.

## Local material previews

Create a study space and choose **Preview material**. Select a text-based PDF or UTF-8 TXT file. The original and extracted text remain in memory in the current tab; closing the preview, changing spaces, signing out, or reloading discards them. Nothing is uploaded to D1, R2, or an AI provider. A failed replacement leaves the previous successful preview visible.

Limits are 10,000,000 bytes (decimal 10 MB), 50 PDF pages, 500,000 extracted UTF-16 characters, and 500 chunks. PDF parsing uses a lazy-loaded, locally bundled PDF.js worker. Chunk offsets refer to normalized extracted section text, not PDF byte positions. Password-protected, unreadable, textless, or oversized material is rejected with explicit recovery guidance. English support is disclosed; language detection is not implemented.

Always compare equations, symbols, tables, and reading order with the original. Extraction is not verification of meaning or correctness. The preview shows one page/section at a time, capped at 20,000 visible characters, with a truncation notice. Device testing and source storage remain open roadmap gates.

Synthetic fixtures are reproducible with `node scripts/generate-material-fixtures.mjs`. Real PDF.js extraction runs in the browser tests; pure file validation/chunking rules run with Vitest.

## Implementation layout

- `apps/web`: React interface and client request handling.
- `apps/worker`: Hono routes, session resolution, ownership and request validation.
- `packages/contracts`: versioned boundary schemas.
- `packages/adapters`: internal fake AI adapter.
- `migrations`: auth tables and one application table, `study_spaces`.
- `tests`: synthetic contracts and Worker/D1 integration checks.

A study-space ID is not authorization. The Worker resolves the session and scopes data access to its user ID. Authentication requires multiple library-owned tables; the roadmap's initial “one table” means one **application** table, alongside auth tables in the same D1 database.

The `sharp` override pins 0.35.5 to resolve the transitive librsvg advisory in Cloudflare local tooling. Revisit the override when upstream Miniflare updates its dependency. npm 11 is pinned because npm 10 failed while resolving the current test-tool peer dependencies.
