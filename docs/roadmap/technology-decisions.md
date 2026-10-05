# Technology decisions

**Status:** recommended implementation baseline; validate and pin exact compatible versions in M0. No libraries are installed by this document. Bedrock preference follows the available-funding constraint; it does not depend on OpenAI credits.

| Area | Recommendation | Reason and alternative |
| --- | --- | --- |
| Web | React + TypeScript + Vite | Lightweight local-first client application; Next.js remains an alternative if server rendering becomes necessary, which the current PRD does not require |
| Styling | CSS with shared accessible components and tokens | Keep mobile UI readable and assets small; add a component library only for a concrete accessibility or delivery benefit |
| AI endpoint | Stateless TypeScript on Node.js; streaming Lambda Function URL candidate | Credentials and provider prompts remain server-side; no learner database, login service or durable jobs |
| Validation | Zod schemas at browser/API/provider boundaries | Validate shape plus application invariants; provider JSON syntax is insufficient |
| Extraction | PDF.js (`pdfjs-dist`) text extraction; explicit TXT decoding | Preserve page evidence without OCR; test browser parsing performance and equation/table limitations before committing to implementation |
| Math rendering | KaTeX with `trust: false`, bounded expression size and accessible MathML output | Readable equations from model-written LaTeX without executing content; show raw text fallback on render failure |
| Numeric checking | Small deterministic checker: finite-number parsing, absolute/relative tolerance, allow-listed unit conversions | Final answers graded locally against reviewed keys; no `eval`, no general symbolic algebra in P0 |
| Canonical learner data | IndexedDB through Dexie | Local originals, chunks, self-contained packs, drafts and progress; transactional writes and honest storage-loss disclosure |
| AI | AWS SDK for JavaScript v3, Bedrock Runtime Converse/ConverseStream adapter | AWS billing and replaceable provider boundary; fake adapter for local work and deterministic tests |
| Pre-generation | One bounded browser-initiated next-pack request while studying | Reduce waiting without a queue; cancel stale work and measure unused-pack cost |
| Web hosting | HTTPS static assets; S3/CloudFront candidate with streaming endpoint routing | S3 holds app assets only; no learner files. Verify proxy streaming, no-store AI responses and deployment-level rate controls |
| Infrastructure | AWS SAM/CloudFormation templates | Reproducible small serverless deployment; avoid adding several competing provisioning tools |
| Verification | Vitest for domain/contracts; Playwright for browser journeys | Deterministic rules plus local persistence, interrupted-request and UI checks; manually inspect generated educational content |
| CI | Repository-hosted checks for format, lint, types, file length, tests and links | Start with actual runnable scripts and pin dependencies; fake providers are the default CI path |

Official capability references: [Vite templates](https://vite.dev/guide/), [React TypeScript](https://react.dev/learn/typescript), [Zod](https://zod.dev/), [PDF.js](https://mozilla.github.io/pdf.js/getting_started/), [Dexie](https://dexie.org/docs/), [Bedrock JS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html), [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html), [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro).

These are engineering recommendations, not claims that this combination has been benchmarked for TAI. M0 must prove browser PDF extraction and one bounded streamed Bedrock response before the real provider pipeline is considered viable.

## Proposed repository layout

```text
apps/web/                  UI, local extraction, canonical IndexedDB storage
apps/api/                  Stateless streaming AI handlers and request limits
packages/domain/           Learning evidence, sessions, review rules
packages/contracts/        Versioned API, pack and provider schemas
packages/adapters/         Bedrock, IndexedDB and fake implementations
packages/content/          Prompt versions and checked resource catalog
infra/                     SAM templates and safe configuration examples
tests/                     Cross-boundary fixtures and end-to-end checks
docs/roadmap/              Plan, decisions and acceptance evidence index
```

Create only directories needed by the active milestone. A monorepo does not require separately deployed services for every module. Use one package manager and lockfile; choose compatible versions at bootstrap and document exact commands in the developer guide. No source file exceeds 350 physical lines.

## Alternatives and revisit triggers

- A stateless Node HTTP service is the local-demo fallback if Lambda streaming is unavailable. It needs server-side Bedrock credentials, not SQLite or another learner database. Do not claim AWS deployment validation from a local run.
- Do not add managed vector search, embeddings, Knowledge Bases, AgentCore, runtime multi-agent orchestration, or provisioned model throughput for the first demo. Revisit retrieval only after source-quality measurements show the need.
- Curate real free resources manually across the demonstration subjects. Automated Google/YouTube discovery is not a dependency.
- Start with a simple source-linked concept map and equivalent list; avoid graph-layout infrastructure unless usability requires it.
- Select model/region by actual access, quality, cost and latency tests. A model family or pricing example is not a pinned deployment identifier.

## M0 decision record to fill during implementation

Record exact runtime/package versions, package manager, deploy region, selected model or inference-profile ID, account-plan constraints, PDF extraction results, browser storage/migration behavior and streaming transport results, model evaluation evidence, and measured cost sample. Until verified, these fields remain pending. A different implementation choice needs a brief rationale and corresponding roadmap update, not a new approval ceremony for routine engineering decisions.

Full offline mode, service-worker/app-shell caching, pin/save actions and reconnect queues are P1 work, not dependencies of this stack. IndexedDB remains P0 regardless of that deferral.
