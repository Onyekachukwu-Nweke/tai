# M2.2 activity-pack persistence evidence

Status: **in progress**. The live-provider path is implemented, but content audit and deployed end-to-end evidence remain open, so this does not complete M2 or FR-03.

## Implemented

- Preparing a pack sends a schema version and request UUID only. The Worker resolves the signed-in owner, current ready material revision, current concept generation, selected concept IDs, labels and exact saved chunks.
- At least two selected source-backed concepts are required. Provider output is limited to 3–5 recall, explanation, scenario and multiple-choice prompts. Calculation generation awaits deterministic numeric-key review.
- A strict canonical schema validates question, concept, option and citation identifiers; exact citation location, offsets and text; question bounds; two-concept coverage; and the one-correct-option invariant.
- Canonical self-contained JSON in D1 includes private supported answers, rubrics and MCQ keys. A separate strict learner DTO omits those fields, rubrics and answer explanations. This slice does not expose submission, reveal or grading controls.
- Stable Worker UUIDs identify saved packs. Replaying a successful request UUID avoids another provider call. A failed explicit retry retains the last ready pack. Revision, concept-generation, selection and deletion gates reject late saves.
- Saved prompts reload on another authenticated request and link back to the exact extracted excerpt and PDF page through the existing source reader.
- Normal development and deployment resolve activity packs through Workers AI and AI Gateway. Model output is constrained to recall, explanation, scenario and MCQ drafts, reconstructed from server-loaded sources, and revalidated before persistence. Calculation generation remains excluded until numeric keys can be reviewed deterministically.
- Successful requests persist provider, exact model, prompt version and output schema version. Failed regeneration retains the previous pack and its provenance.

## Current limitation

Deterministic fake providers remain test scaffolding. A minimal live model probe established authenticated structured-output access, but it did not audit generated learning content. Model comparison, calculation generation, live rubric grading, content audits and measured session budgeting remain open.

Automated coverage checks server-side context loading, learner-response privacy, canonical persistence, idempotency, failed-retry preservation, ownership, two-concept selection, exact whitespace-preserving citations, cross-concept citations, MCQ keys and three-option bounds, late selection changes, reload and keyboard-operable source navigation.

On 11 October 2026, `npm run check` passed formatting, lint, TypeScript, 225 authored-file length checks, 97 local documentation links, 9 maintenance/parser tests, 155 Worker/contract tests, 48 Chromium tests, the Vite production build and the Wrangler dry-run build. The 13 focused activity-pack tests also passed independently. Migration `0019_activity_pack_provider_provenance.sql` passed fresh and populated migration checks and was applied to remote D1. A minimal live structured-output probe succeeded; live pack content review and deployed end-to-end behavior remain open.
