# Technology decisions

**Status:** agreed baseline as of 6 October 2026; pin exact versions in M0. No libraries are installed by this document.

| Area | Decision | Reason and alternative |
| --- | --- | --- |
| Web | React + TypeScript + Vite | Lightweight client served as Worker static assets |
| Styling | CSS with shared accessible components and tokens | Small assets and readable mobile UI; add a component library only for a concrete benefit |
| API | One Cloudflare Worker (TypeScript, Hono router) serving static assets and `/api/*` | One deployable; streaming responses are native; Cloudflare edge locations near learners |
| Auth | Required Google sign-in via Better Auth on D1 | Workers-compatible, data stays in our D1. Confirm in M0; a hosted provider (e.g. Clerk) is the fallback if integration stalls |
| Database | Cloudflare D1 (SQLite) | Native binding, no connection management, free tier fits the hackathon. Neon Postgres via Hyperdrive is the fallback if Postgres features are required. Do not run two databases |
| File storage | Cloudflare R2, private bucket | Original PDF/TXT files under owner-scoped keys, served only through the Worker |
| AI routing | Cloudflare AI Gateway | Per-route rate limits, fallback between providers, usage metrics; configure it not to store prompt/response bodies |
| AI models | Workers AI and Amazon Bedrock behind one adapter | Choose per task by measured quality; see [AI provider and budget](ai-provider-and-budget.md) |
| Validation | Zod at browser/API/provider boundaries | Shape plus application invariants; provider JSON syntax is insufficient |
| Extraction | PDF.js (`pdfjs-dist`) in the browser; explicit TXT decoding | Avoids Worker CPU limits; learner sees extraction problems before upload. No OCR |
| Math rendering | KaTeX with `trust: false`, bounded expression size, MathML output | Readable equations without executing content; raw-text fallback on failure |
| Numeric checking | Small deterministic checker: finite-number parsing, absolute/relative tolerance, allow-listed units | Shared by browser and Worker; no `eval`, no symbolic algebra in P0 |
| Infrastructure | Wrangler (`wrangler.toml`) for Worker, D1, R2 and bindings; D1 migrations in the repo | One tool; no SAM/CloudFormation |
| Verification | Vitest (with the Workers test pool) for domain, API and contracts; Playwright for browser journeys | Deterministic rules, ownership and persistence checks; manual content review for generated material |
| CI | Format, lint, types, file length, tests and links | Fake AI provider is the default CI path |

These are engineering decisions, not benchmarks. M0 must prove sign-in, a D1 write/read, browser PDF extraction and one streamed model response through AI Gateway before the real pipeline is considered viable.

## Proposed repository layout

```text
apps/web/                  React UI, PDF.js extraction, rendering
apps/worker/               Hono API, auth, ownership checks, AI task handlers
packages/domain/           Grading, numeric checks, evidence, sessions, review rules
packages/contracts/        Versioned API, pack and provider schemas
packages/adapters/         Workers AI, Bedrock, D1, R2 and fake implementations
packages/content/          Prompt versions and checked resource catalog
migrations/                D1 SQL migrations
tests/                     Cross-boundary fixtures and end-to-end checks
docs/roadmap/              Plan, decisions and acceptance evidence index
```

Create only directories needed by the active milestone. Use one package manager and lockfile. No source file exceeds 350 physical lines.

## Alternatives and revisit triggers

- MongoDB Atlas is not used: its driver needs extra compatibility work on Workers and the Atlas Data API has been removed.
- Do not add vector search, embeddings, agent frameworks or queues for the first demo. Revisit retrieval only after source-quality measurements show the need.
- Curate real free resources manually. Automated Google/YouTube discovery is not a dependency.
- Start with a concept list plus a simple map; avoid graph-layout infrastructure unless usability requires it.
- If the Workers Free plan CPU limit is hit by streaming validation, move to Workers Paid rather than restructuring.

## M0 decision record to fill during implementation

Record exact package versions, Wrangler/compatibility date, auth library and OAuth setup, D1/R2 binding names, AI Gateway configuration, selected model per task with evaluation evidence, PDF extraction results on a low-end Android device, and a measured cost sample. A later change needs a brief rationale and a roadmap update.
