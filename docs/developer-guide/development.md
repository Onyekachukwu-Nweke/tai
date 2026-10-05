# Development

Build tai against [PRD v0.2](../../PRD_v2.md), including its confirmed hackathon decisions. The repository currently contains documentation; the [roadmap](../roadmap/README.md) proposes a TypeScript web application with AWS Bedrock and serverless storage/hosting. Exact versions, account/model access, and deployment feasibility must pass M0; executable setup commands do not exist yet.

## Product boundaries

The core journey is PDF/TXT upload → extraction and preview → concept selection → source-linked activities → feedback → saved progress → review and return.

- Support text-based PDF and TXT, one material per study space, and English only.
- Deliver P0 features before stretch work. OCR, additional formats/languages, and cross-device synchronization are outside this hackathon scope.
- Keep proposed upload limits, review intervals, and inactivity thresholds configurable.
- Preserve learner control: allow skips, hints, deliberate reveals, changed time budgets, and review overrides.
- Retain uploaded source files until learner deletion.

## Implementation boundaries

Keep domain rules independent of UI frameworks and external providers. Use clear boundaries for extraction, source storage, AI generation, output validation, attempts, review scheduling, and offline packs. These are responsibilities, not a requirement for separate services.

AI drafts concepts, explanations, questions, rubrics, and practical tasks using selected source chunks. Application code owns validation, access control, exact multiple-choice grading, session budgets, review dates, persistence, and deletion. Validate model output and source references before exposing a prepared pack.

Prefer a small web application with a server-side AI endpoint and browser persistence where sufficient. Choose the simplest implementation that meets the PRD; record actual decisions and their reasons here as they are made.

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
