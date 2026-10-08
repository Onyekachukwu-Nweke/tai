# M2.2 activity-pack persistence evidence

Status: **in progress**. This bounded fake-provider slice does not complete M2 or FR-03.

## Implemented

- Preparing a pack sends a schema version and request UUID only. The Worker resolves the signed-in owner, current ready material revision, current concept generation, selected concept IDs, labels and exact saved chunks.
- At least two selected source-backed concepts are required. Provider output is limited to 3–5 recall, explanation and source-identification multiple-choice prompts in this slice. Scenario and calculation generation await a provider and evidence capable of supporting them.
- A strict canonical schema validates question, concept, option and citation identifiers; exact citation location, offsets and text; question bounds; two-concept coverage; and the one-correct-option invariant.
- Canonical self-contained JSON in D1 includes private supported answers, rubrics and MCQ keys. A separate strict learner DTO omits those fields, rubrics and answer explanations. This slice does not expose submission, reveal or grading controls.
- Stable Worker UUIDs identify saved packs. Replaying a successful request UUID avoids another provider call. A failed explicit retry retains the last ready pack. Revision, concept-generation, selection and deletion gates reject late saves.
- Saved prompts reload on another authenticated request and link back to the exact extracted excerpt and PDF page through the existing source reader.

## Current limitation

The deterministic fake provider makes no external request and is disclosed in the interface. Its output is test scaffolding, not evidence of educational quality. Live-provider access, per-user quotas, model comparison, scenarios, calculations, submissions, grading, hints, reveals, skips, content audits and measured session budgeting remain open.

Automated coverage checks server-side context loading, learner-response privacy, canonical persistence, idempotency, failed-retry preservation, ownership, two-concept selection, exact whitespace-preserving citations, cross-concept citations, MCQ keys and three-option bounds, late selection changes, reload and keyboard-operable source navigation.

On 8 October 2026, `npm run check` passed formatting, lint, TypeScript, 85 authored-file length checks, 76 local documentation links, 9 maintenance/parser tests, 49 Worker/contract tests, 40 Chromium tests, the Vite production build and the Wrangler dry-run build. `0004_activity_packs.sql` applied successfully to local D1. After the final exact-citation preservation change, the 7 focused contract/Worker tests and the activity-pack Chromium test also passed. No remote environment or live model was exercised.
