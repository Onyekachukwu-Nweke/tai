# Technology decisions

**Status:** recommended implementation baseline; validate and pin exact compatible versions in M0. No libraries are installed by this document. Bedrock preference follows the available-funding constraint; it does not depend on OpenAI credits.

| Area | Recommendation | Reason and alternative |
| --- | --- | --- |
| Web | React + TypeScript + Vite | Lightweight client application with explicit offline routes; Next.js remains an alternative if server rendering becomes necessary, which the current PRD does not require |
| Styling | CSS with shared accessible components and tokens | Keep mobile UI readable and assets small; add a component library only for a concrete accessibility or delivery benefit |
| API/worker | TypeScript on an AWS-supported Node.js LTS runtime, Lambda handlers | Shared schemas/domain rules with browser; Python is an alternative only if extraction evaluation demonstrates a material advantage |
| Validation | Zod schemas at browser/API/provider boundaries | Validate shape plus application invariants; provider JSON syntax is insufficient |
| Extraction | PDF.js (`pdfjs-dist`) text extraction; explicit TXT decoding | Preserve page evidence without OCR; test server packaging and equation/table limitations before committing to implementation |
| Browser data | IndexedDB through Dexie; service worker for app shell | Durable local packs/outbox and offline reload; no claim of permanent backup |
| AI | AWS SDK for JavaScript v3, Bedrock Runtime Converse adapter | AWS billing and replaceable provider boundary; fake adapter for local work and deterministic tests |
| Cloud data | Private S3 objects + DynamoDB on-demand metadata/records | Retained originals and job state without an always-running database; partition and item sizing must be tested |
| Background work | SQS + one preparation worker | Decouple extraction/generation from HTTP timeouts; at-least-once delivery requires idempotent job handling |
| Web hosting | Private S3 origin + CloudFront; same-origin API route | HTTPS and shared browser origin for guest cookies; deployment smoke test must verify API forwarding and no caching of personalized responses |
| Infrastructure | AWS SAM/CloudFormation templates | Reproducible small serverless deployment; avoid adding several competing provisioning tools |
| Verification | Vitest for domain/contracts; Playwright for browser journeys | Deterministic rules plus real reload/offline/UI checks; manually inspect generated educational content |
| CI | Repository-hosted checks for format, lint, types, file length, tests and links | Start with actual runnable scripts and pin dependencies; fake providers are the default CI path |

Official capability references: [Vite templates](https://vite.dev/guide/), [React TypeScript](https://react.dev/learn/typescript), [Zod](https://zod.dev/), [PDF.js](https://mozilla.github.io/pdf.js/getting_started/), [Dexie](https://dexie.org/docs/), [Bedrock JS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html), [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html), [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro).

These are engineering recommendations, not claims that this combination has been benchmarked for TAI. M0 must prove a tiny PDF extraction and one Bedrock response before the real provider pipeline is considered viable.

## Proposed repository layout

```text
apps/web/                  UI, browser storage, service worker
apps/api/                  HTTP handlers and guest authorization
apps/worker/               Extraction/generation job entry points
packages/domain/           Learning evidence, sessions, review rules
packages/contracts/        Versioned API, pack and provider schemas
packages/adapters/         Bedrock, S3, DynamoDB and fake implementations
packages/content/          Prompt versions and checked resource catalog
infra/                     SAM templates and safe configuration examples
tests/                     Cross-boundary fixtures and end-to-end checks
docs/roadmap/              Plan, decisions and acceptance evidence index
```

Create only directories needed by the active milestone. A monorepo does not require separately deployed services for every module. Use one package manager and lockfile; choose compatible versions at bootstrap and document exact commands in the developer guide. No source file exceeds 350 physical lines.

## Alternatives and revisit triggers

- A single Node service with SQLite is a viable local-demo fallback if AWS hosting is unavailable. It still needs server-side Bedrock credentials and durable job/storage behavior; do not claim AWS deployment validation from a local run.
- Do not add managed vector search, embeddings, Knowledge Bases, AgentCore, runtime multi-agent orchestration, or provisioned model throughput for the first demo. Revisit retrieval only after source-quality measurements show the need.
- Curate real free resources manually across the demonstration subjects. Automated Google/YouTube discovery is not a dependency.
- Start with a simple source-linked concept map and equivalent list; avoid graph-layout infrastructure unless usability requires it.
- Select model/region by actual access, quality, cost and latency tests. A model family or pricing example is not a pinned deployment identifier.

## M0 decision record to fill during implementation

Record exact runtime/package versions, package manager, deploy region, selected model or inference-profile ID, account-plan constraints, PDF extraction results, guest-session lifetime policy, model evaluation evidence, and measured cost sample. Until verified, these fields remain pending. A different implementation choice needs a brief rationale and corresponding roadmap update, not a new approval ceremony for routine engineering decisions.
