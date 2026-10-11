# M2 source-grounded rubric grading evidence

Status: live Workers AI path implemented and locally verified with synthetic responses; live grading quality and deployed end-to-end behavior remain unverified.

This slice grades saved `explain` and `scenario` attempts against the canonical rubric and exact source excerpts already stored with the current activity pack. The browser sends only a request ID and attempt ID. The Worker resolves the learner, saved answer, current question, rubric, and sources before calling the provider.

The response contract accepts the outcomes `supported`, `partial`, `not_supported`, and `uncertain`. It bounds overall and per-element feedback, requires one result for every unchanged canonical rubric element, and rejects citations that do not exactly match the question sources. The Workers AI adapter accepts indexed judgments and source IDs, then reconstructs request IDs, canonical rubric text and complete citations locally before applying this contract. Prompt, answer, criteria and excerpts are explicitly treated as untrusted data. The deterministic fake remains test infrastructure.

Grading requests are owner-scoped and reserved before provider work. An identical ready request replays its saved response without another provider call. Failed requests remain failed and require an explicit retry with a new request ID. Final persistence checks that the attempt and current pack revision still exist, the space is not deleted, and the question has not been flagged. Rubric outcomes do not update concept progress.

Normal development and deployment use Workers AI through AI Gateway with caching and per-request body logging disabled. Each request records provider, exact model, prompt version and output schema version. Automated tests use an isolated Wrangler configuration without a live AI binding. Live failures do not fall back to fake feedback.

The final M2 review adds a database-enforced single active rubric request per
owner-scoped attempt. Concurrent different request IDs cannot both reach the
provider; a failed reservation releases the attempt for an explicit new-ID
retry. Migration 0013 retains legacy rows and follow-up references while
marking duplicate pending requests failed. A ready request takes precedence;
otherwise the oldest pending request remains active.

The explanation attempt is persisted before grading begins. If grading fails, the saved attempt and browser draft remain, and the learner gets an explicit retry control. Successful feedback and its source links restore after reload. The interface discloses that an explicit rubric request sends the saved answer and cited excerpts to the configured provider and exposes outcome text in addition to visual styling.

Automated evidence covers strict schema bounds, unchanged rubric elements, exact citations, server-built private context, owner isolation, immutable request replay, failed-request retry rules, flagged-question rejection, no progress advancement, draft retention after grading failure, explicit retry, source-linked feedback, and reload restoration.

Focused automated coverage also checks live request shape, named gateway, disabled cache/log collection, malformed output, rubric cardinality and order, invented/repeated citations, fail-closed configuration and exact provenance. Remaining work includes live content-quality review and migrating hints, follow-up, and practical tasks. Numeric final-answer checking remains deterministic; live rubric output can comment on working steps but cannot replace that result. No live rubric quality, cost, latency, or retention claim has been established.

On 11 October 2026, the complete repository gate passed 160 Worker/contract tests, 49 Chromium tests, 9 maintenance/parser tests, formatting, lint, TypeScript, 229 authored-file length checks, 97 local documentation links, the production build and Wrangler dry run. Migration `0020_activity_rubric_provider_provenance.sql` passed fresh and populated upgrade checks and was applied to remote D1. The live rubric adapter has not yet been exercised against learner content; the earlier minimal structured-output probe establishes provider access only.
