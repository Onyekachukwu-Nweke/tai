# M2 attempt persistence evidence

Status: bounded M2.3/M3.2 slice implemented; M2 and M3 remain in progress.

This slice records immutable activity interactions before the interface shows completion. A client-generated attempt ID and server-side SHA-256 request fingerprint make an identical explicit retry return the saved result, while a changed payload receives a conflict. The Worker reloads the current owner-scoped canonical pack and question before independently checking an MCQ.

The authenticated learner pack carries bounded recall and MCQ review keys so the browser can provide immediate deterministic checks. The interface keeps them hidden until submit or deliberate reveal. Browser storage contains only the learner's draft, selected option, optional confidence and stable attempt ID; it never stores review keys. A failed request preserves that draft and requires an explicit retry. Reconnection does not trigger submission.

Recorded interactions keep MCQ correctness, recall self-assessment, ungraded explanations, reveals, skips, confidence and hint use separate. Incorrect and ambiguous flags live in separate persisted question state, preserve attempt history, reload across devices and exclude the question from future scored submissions. Source-backed feedback is labeled as supported by the learner's material. Explanations are explicitly saved without grading in this slice.

Automated coverage exercises deterministic checks, immutable replay, concurrent duplicate submission, changed-payload conflicts, distinct non-scored outcomes, ownership, current-revision rejection, deletion cascade, interrupted browser saves, reload persistence and local-storage privacy.

On 8 October 2026, `npm run check` passed formatting, lint, TypeScript, 95 authored-file length checks, 76 local documentation links, 9 maintenance/parser tests, 54 Worker/contract tests and 42 Chromium tests, followed by the Vite production build and Wrangler dry-run build. All migrations through `0005_activity_attempts.sql` also applied successfully to a fresh disposable local D1 state. No remote environment or live model was exercised.

Still open: rubric/model grading, scenarios, calculations, hints and alternate explanations, targeted follow-up, progress/review scheduling, quotas, streaming, live-provider validation and content audit.
