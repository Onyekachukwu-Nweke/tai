# Development handover

**Prepared:** 11 October 2026
**Specification:** [PRD v0.2](../../PRD_v2.md)
**Repository state:** reviewed M4.1 practical tasks are ready for a pull request on `feat/practical-tasks`
**Feature revision:** pending practical-task commit
**Merged baseline:** `5f82949` (PR #20, safe account and data deletion)

## Resume here

1. Review and merge the practical-task pull request after it is opened from `feat/practical-tasks`.
2. Apply local D1 migrations through `0017` with `npm run db:migrate`.
3. After M4.1 merges, use a new branch for M4.2's small reviewed resource catalog.

Do not commit `.env` or populated `.dev.vars`. Do not add guest mode, a second database, a queue, autonomous agent behavior, or P1 offline features.

## Current product state

TAI has a working local P0 path built on a React web app and one Cloudflare Worker. Google authentication, D1 ownership, private R2 originals, browser PDF/TXT extraction, source-backed concepts, activities, saved attempts, study sessions, recovery sessions, deterministic review projection, and account/space deletion are implemented locally.

The implementation uses deterministic fake AI providers. It does not yet establish a production AI provider, deployed performance, educational quality, or cost evidence.

### Implemented foundations

- Google-only sign-in through Better Auth; server-resolved ownership for every study-space operation.
- PDF and TXT validation/extraction in the browser, private original storage in R2, stable source chunks in D1, and explicit source viewing.
- Tombstone-first study-space deletion with late-write rejection and explicit retry.
- Versioned D1 migrations through merged `0016_account_deletion_fence.sql`; M4.1 adds pending `0017_practical_tasks.sql`.
- Per-user daily AI request-credit quotas with total/category limits, kill switch, UTC reset metadata, replay protection, and structured learner messages.
- Account deletion: durable user fence, atomic mutation denial, owner-scoped R2 cleanup, D1/auth cascade, confirmation UI, processing disclosure, and user-scoped browser-draft cleanup.

### Implemented learning loop

- Editable source-linked concepts with map/list parity.
- Persisted 3–5 question packs using recall, MCQ, explain, scenario, and a bounded calculation fixture.
- Hidden review keys, deterministic MCQ and numeric grading, recall self-check, reveal, skip, flagging, confidence, hints, alternate explanations, rubric feedback, and targeted follow-up grading.
- Attempts are immutable and idempotent; browser drafts remain available for explicit retry after request failures.
- Safe KaTeX rendering and source-reference validation.

### Implemented continuity

- Persisted 5/15/30-minute learn, review, and practise sessions.
- Atomic attempt/session progress updates and session summaries.
- Deterministic concept review projection using eligible unflagged MCQ evidence and 1/3/7/14-day intervals.
- Configurable inactivity recovery that resumes unfinished work or creates a bounded ten-minute review.

### Practical tasks in the current branch

- Exactly one explicit selected concept with current source and revision validation on generation, reload, and completion.
- Persisted safe standard, simpler, and no-cost variants with allowlisted modality plus structured cost and connectivity disclosures.
- Deterministic hazardous-procedure and external-URL rejection before save.
- Exact replay, practical quota reservation, deletion fences, and late-save rejection.
- Durable unsuitable decisions and completion/undo state separate from quiz evidence.
- Source navigation plus keyboard-operable native controls and responsive existing layouts.

See [M4.1 evidence](m4-practical-task-evidence.md). Independent review, full local checks, and migration checks pass; live-provider content quality and the manual safety audit remain open.

### Verification on the current branch

- 145 Vitest tests across 37 files.
- 48 Playwright tests, including the practical-task workflow.
- 9 maintenance tests.
- Formatting, ESLint, TypeScript, 215-file line limit, and 97 documentation links.
- Fresh migrations through `0017` and populated `0016 → 0017` upgrade with no foreign-key violations.
- Vite production build and Wrangler deploy dry run.

## Verification at merged handover

The exact PR #20 tree passed `npm run check`:

- Prettier, ESLint, and TypeScript.
- 201 authored code files within the 350-line limit.
- 88 local documentation links.
- 9 maintenance tests.
- 130 Vitest tests across 33 files.
- 47 Playwright tests.
- Vite production build and Wrangler deploy dry run.

Independent reviewer and tester passes found no remaining blocking defect. Fresh migrations `0001–0016` and a populated `0015 → 0016` upgrade passed with no foreign-key violations.

## Known limitation in PR #20

If an upload Worker terminates before acknowledging exact-key R2 cleanup, account deletion remains `cleanupPending`. The endpoint retains the user, session, deletion fence, and object ledger instead of risking an orphaned private file or reporting false success. Local stopped-Worker recovery exists; remote operational reconciliation remains unverified. Do not replace this with a timeout or discard the ledger.

## What remains

No roadmap milestone has completed its full exit gate. The main gaps are ordered below.

### 1. Finish M0 provider and deployment readiness

- Inspect Cloudflare account/plan, Workers AI access, AI Gateway, remote D1/R2, logging configuration, and spending controls.
- Decide whether AWS Bedrock remains in scope after checking credit and model access.
- Implement the real provider adapter behind AI Gateway and keep credentials server-side.
- Run bounded synthetic live calls, compare a smaller and stronger available model, and record model IDs, prompt/rule versions, schema compliance, latency, and cost.
- Verify Google OAuth end to end with the deployed callback URI.
- Test PDF extraction on a stated low-end Android device, including a 50-page and math-heavy source.
- Verify streaming through AI Gateway if streaming remains required; current fake-provider work is not live-streaming evidence.

These items block claims that M0, live AI, or deployed infrastructure is complete.

### 2. Close M1 operational and device gates

- Design and verify remote reconciliation for hard-terminated material writers and pending account deletion.
- Run the complete cross-device source pipeline against deployed D1/R2.
- Measure extraction behavior and fidelity for representative mathematical layouts.
- Refresh older evidence text that still says account deletion is unimplemented after PR #20 merges, especially [M1 material evidence](m1-material-persistence-evidence.md).

### 3. Finish M2 quality and generation breadth

- Connect all current provider interfaces to the selected live model route through AI Gateway.
- Audit source fidelity, invented citations, ambiguous MCQs, calculation keys, rubric uncertainty, hints, and targeted follow-ups on permitted synthetic sources.
- Generalize quantitative generation beyond the single reviewed fixture only when equation extraction is readable and keys are independently checked.
- Integrate session/cost budgeting for targeted follow-up and pre-generation.
- Confirm partial/streamed pack behavior: emit only complete validated items, cap next-pack pre-generation, and cancel stale work.

### 4. Finish M3 adaptation

- Add manual review-date override if retained as P0.
- Decide and implement eligible numeric/rubric evidence for review projection; current scored scheduling is intentionally limited to deterministic MCQ evidence.
- Complete due-review plus practice coverage and the five-day-away exit demonstration.
- Measure saved-session opening toward the two-second target on a stated device/network.

### 5. Build remaining M4 features

- **M4.1 practical tasks:** implementation is present on the current branch; finish independent review, migration/full-suite verification, and merge before marking the slice delivered.
- **M4.2 resource catalog:** small manually checked catalog with real dated URLs, publisher, concept, language, format, access conditions, relevance reason, free/access disclosure, and honest no-match behavior.
- **M4.4 accessibility/language:** complete keyboard/focus/contrast/touch/text-size audit; English-only and unsupported-language messaging; simpler-English controls without changing source meaning; supplementary-example labels.
- Validate production provider retention disclosures and account deletion behavior without promising deletion from external providers.

Recommended next code slice after M4.1 merges: M4.2 resource catalog using a small manually checked set of dated, free links.

### 6. Run M5 demo verification

- Audit at least 20 generated items across two subjects.
- Run the complete learner journey, including both answer outcomes, source inspection, scenario/calculation, hint/explanation, targeted follow-up, five-day recovery, dropped requests, quota exhaustion, and deletion.
- Measure extraction, first-pack preparation, saved-session opening, payload sizes, provider cost, and latency on stated conditions.
- Exercise malicious inputs, provider unavailability, duplicate submissions, interrupted writes, unauthenticated/cross-user requests, and deletion races.
- Record the exact revision and honest participant count; do not invent pilot, performance, cost, or retention results.

## Environment and local commands

Required local values are documented in [`.dev.vars.example`](../../.dev.vars.example):

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RETURN_GAP_DAYS`
- `AI_CALLS_ENABLED`
- daily total, concept, pack, grading, support, and practical limits

Typical resume commands:

```sh
npm ci
npm run db:migrate
npm run dev
npm run check
```

Use Node 22 and the pinned npm version from the repository. Follow [setup](../developer-guide/setup.md), [testing](../developer-guide/testing.md), and [PR/commit guidance](../developer-guide/pr-commits.md). Never print secrets, learner documents, or raw answers.

## Important implementation rules

- Treat documents, resource metadata, and model output as untrusted data.
- Keep AI generation separate from deterministic validation, grading, review rules, persistence, quota enforcement, and deletion.
- Every query and R2 key must use the server-resolved user ID; a study-space ID is never authorization.
- Preserve stable source IDs and reject unsupported citations or changed material revisions.
- Save submissions before completion UI, retain local answers on failure, and avoid duplicate provider calls on retries.
- Hints, reveals, skips, confidence, and correctness remain distinct.
- Keep each authored code file at or below 350 physical lines.
- Full offline mode remains P1; do not add a service worker, outbox, offline queue, or reconnect replay.

## Documentation caveat

The detailed evidence documents are the authoritative record for each bounded slice. Some older summaries contain stale “not implemented” lists because later PRs delivered those capabilities. After PR #20 merges, do a focused documentation consistency pass before claiming any milestone complete; update stale lists without rewriting historical test evidence.
