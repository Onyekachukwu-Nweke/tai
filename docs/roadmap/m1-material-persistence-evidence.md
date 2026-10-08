# M1 material persistence evidence — 8 October 2026

Scope: owner-scoped original and extracted-material persistence on `feat/material-persistence`. This advances M1.1–M1.3 and FR-01. It does not complete M1 or FR-11.

## Implemented behavior

- A signed-in learner saves one immutable PDF or TXT material per study space.
- The Worker rechecks original byte size and type, validates TXT bytes against normalized extracted text, and validates PDF structure, encryption status and actual page count.
- Source sections and chunks are stored separately in D1 with document IDs, page/section locations and normalized-text offsets. The private original is stored under an owner- and space-scoped R2 key.
- Same-document retries are idempotent when the original and validated preview match. A different payload conflicts instead of replacing the material.
- Saved previews reopen after reload. Original downloads pass through ownership checks and use private, no-store attachment responses.
- Study-space deletion tombstones first, denies reads and new writes, removes source rows and the registered R2 object, and returns pending cleanup until an in-flight writer settles. Pending deletion remains visible after reload for explicit retry.

## Failure and privacy boundaries

D1 and R2 cannot commit atomically. The upload ledger reserves an immutable key before R2 writes and gates D1 commit on an active owner-scoped space and exact reservation key. Ambiguous acknowledgements are reread before cleanup so a committed original is not deleted. Failed cleanup retains its key and state.

The pinned pdf-lib dependency is patched reproducibly during install, test and build. Exact source hashes fail closed on dependency changes. The patch rejects document-controlled oversized numeric values without logging them and adds parser/decode budgets. Page counting uses bounded iterative traversal rather than recursive `getPages()`.

A hard-terminated Worker can strand an unsettled writer. Local development has an explicit stopped-Worker recovery command documented in the developer guide. Remote recovery remains unverified, so M1 is not complete and a timeout is never treated as proof that a writer has stopped.

## Verification

On 8 October 2026, a clean `npm ci` applied the SHA-pinned pdf-lib patch and reported zero known vulnerabilities. The subsequent `npm run check` passed formatting, lint, TypeScript, 63 authored-file length checks, 74 local documentation links, 9 maintenance and parser-limit tests, 40 Workers/D1/R2 tests, 32 Chromium browser tests, the Vite production build and the Wrangler dry-run build with D1, private R2 and asset bindings.

The stopped-Worker local recovery walkthrough used an explicitly synthetic `writing` import and exact owner-scoped R2 object. With every Wrangler process stopped, `npm run materials:recover -- --local --confirm-worker-stopped` recovered one import. A direct D1 read showed the ledger in `failed`, and an R2 read showed that the registered object no longer existed. The synthetic D1 records were then removed. Retry behavior after a failed ledger is covered by the Workers integration suite; remote recovery was not exercised.

Synthetic tests cover ownership, origin checks, malformed and forged material input, exact source references, idempotent replay, changed-payload conflict, D1/R2 failure, lost acknowledgements, upload/deletion races, reload, retry and pending deletion. No private learner material is used.

## Remaining gates

- Provisioned Cloudflare D1/R2 and remote cleanup/recovery are not verified.
- Account deletion remains unimplemented, so FR-11 is incomplete.
- Live Google OAuth walkthrough, AI provider feasibility, low-end Android extraction and complex mathematical-layout fidelity remain open M0/M1 evidence gates.
- PDF structural parsing has defensive budgets but still requires deployed CPU/memory measurement on representative and adversarial documents.

See [local setup](../developer-guide/setup.md) for development and recovery commands.
