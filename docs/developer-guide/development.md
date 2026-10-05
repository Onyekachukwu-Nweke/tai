# Development

Build tai against [PRD v0.2](../../PRD_v2.md), including its confirmed hackathon decisions. The repository currently contains documentation; the [roadmap](../roadmap/README.md) proposes a TypeScript web application with browser extraction, canonical IndexedDB storage, and a stateless server-side AWS Bedrock gateway. Exact versions, account/model access, and deployment feasibility must pass M0; executable setup commands do not exist yet.

## Product boundaries

The core journey is PDF/TXT upload → extraction and preview → concept selection → source-linked activities → feedback → saved progress → review and return.

- Support text-based PDF and TXT, one material per study space, and English only.
- Deliver P0 features before stretch work. OCR, additional formats/languages, and cross-device synchronization are outside this hackathon scope. Full offline mode is deferred to P1.
- Keep proposed upload limits, review intervals, and inactivity thresholds configurable.
- Preserve learner control: allow skips, hints, deliberate reveals, changed time budgets, and review overrides.
- Retain uploaded source files until learner deletion.

## Implementation boundaries

Keep domain rules independent of UI frameworks and external providers. Use clear boundaries for extraction, source storage, AI generation, output validation, attempts, review scheduling, and self-contained activity packs. These are responsibilities, not a requirement for separate services.

AI drafts concepts, explanations, questions, rubrics, and practical tasks using selected source chunks. Application code owns validation, local study-space isolation, exact multiple-choice grading, session budgets, review dates, persistence, and deletion. Validate model output and source references before exposing a prepared pack.

Keep original PDF/TXT files, chunks, concepts, packs, drafts, and progress in IndexedDB as the canonical store. Parse documents in the browser. Send only bounded selected text and required answer/rubric context to the stateless Bedrock gateway; do not add server source uploads, a learner database, or authentication. Disclose that browser data removal loses local learning history.

Use small self-contained JSON packs of 3–5 questions, including answers, explanations, and source excerpts. Stream only complete validated items, grade multiple-choice answers locally, and allow one bounded background prefetch for the next pack while the learner studies. Preserve drafts on network failure and offer an explicit bounded retry. Do not add automatic reconnect retries, pending-grading queues, outbox replay, service workers, app-shell caching, save-for-offline controls, or offline status UI. Full offline mode is P1 follow-up.

Delete a study space and its dependent data locally; cancel its in-flight work where possible and discard late responses. No server delete queue is needed. Report quota and transaction failures without losing the current in-memory answer or claiming that unsaved work is durable.

Use a fixed teaching pipeline: read source-grounded material → write an answer → grade → offer targeted follow-up. P0 activities include scenario and calculation questions alongside recall and explanation. Render mathematical notation with KaTeX using safe settings; never execute generated expressions with raw `eval`. Grade numeric answers deterministically against reviewed answer keys with explicit tolerance and unit rules. Use rubric-based model feedback for working steps, preserving an uncertain result when evidence or the key is ambiguous.

Select Bedrock models through a quality-first comparison: evaluate a smaller and a stronger candidate on the same two source documents with the same tasks and scoring rubric. Inspect grounding, teaching quality, scenario/calculation correctness, and grading uncertainty before comparing latency and cost. Record actual model/Region access and results; do not claim unsupported capabilities or select a model on size alone.

All human- and AI-written code files must fit the [350-line rule](code-hygiene.md#file-size-and-responsibility).

## Setup and configuration

When the first implementation is added, document supported runtime versions, dependency installation, local startup, required environment variables, and verification commands. Do not present proposed commands as working tooling.

Commit safe configuration examples and lockfiles. Keep real credentials in ignored local files or the selected secret store. Validate required configuration before using it, and never expose AI credentials to the browser. Tests should use fake providers and synthetic learner data by default.

## Development workflow

1. Identify the PRD requirement and observable acceptance criteria.
2. Use a focused branch following [git-branching.md](git-branching.md).
3. Implement the smallest complete behavior, including recoverable errors and persistence where needed.
4. Update affected contracts, consumers, fixtures, and documentation together.
5. Run configured checks and the relevant verification from [testing.md](testing.md).
6. Inspect the diff and verify the 350-line limit.
7. Describe the outcome and evidence using [pr-commits.md](pr-commits.md), then review with [review.md](review.md).

## Delivery milestones

Follow PRD section 14: source pipeline, learning loop, continuity, application and access, then demo verification. Finish each milestone with a working flow. Simplify map complexity and resource discovery before sacrificing source traceability or the recall-and-return loop.

## Definition of done

A change meets its acceptance criteria, handles relevant failure states, and has verification evidence. Applicable configured checks pass, changed code files respect the size limit, and documentation reflects the actual behavior. Report skipped checks and unresolved limitations explicitly.

For learner-facing flows, check accessibility and connectivity behavior. For stored data, consider reloads, duplicate submissions, schema changes, and deletion. Performance targets remain targets until measured.
