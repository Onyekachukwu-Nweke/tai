# Developer guide

Development guidelines for TAI:

- [Code hygiene](code-hygiene.md): file responsibilities, the 350-line limit, and safe data handling.
- [Agent workflow](agent-workflow.md): principal engineer, coder, reviewer, and tester roles and handoffs.
- [Development](development.md): scope, implementation boundaries, and workflow.
- [Git branching](git-branching.md): branch naming and lifecycle.
- [Pull requests and commits](pr-commits.md): commit conventions and verification evidence.
- [Code review](review.md): review priorities and acceptance checks.
- [Testing](testing.md): test layers, learner scenarios, and content audits.

This guide translates the [v0.2 PRD](../../PRD_v2.md) into initial development guidelines. Refer to the PRD for full acceptance criteria; this guide does not replace them. The [roadmap](../roadmap/README.md) records the Cloudflare baseline: one Worker, required Google sign-in, D1, R2, and AI Gateway in front of Workers AI and Bedrock. Exact model access remains subject to M0 verification.

## Build within the agreed scope

- Prioritize the P0 learner journey: upload material, inspect extracted content, select concepts, complete activities, receive feedback, save progress, and return to study.
- Accept text-based PDF and TXT files only, with one material per study space. Use English for the hackathon interface and generation.
- Keep proposed limits configurable: 10 MB uploads, 50 pages per PDF, review intervals of 1, 3, 7, and 14 days, and a three-day return-flow threshold.
- Keep OCR, additional formats and languages, and cross-device synchronization outside the hackathon scope. Full offline mode is deferred to P1 after the P0 learning loop.

Source: PRD sections 5, 7, 9, and 16–17.

## Preserve source traceability

- Keep stable IDs linking material, extracted chunks, concepts, activities, and attempts. Version persisted schemas.
- Include supporting source references in generated concepts, questions, and feedback. Validate cited IDs against actual extracted chunks before saving a pack.
- Treat uploaded text as untrusted content, never as instructions. Sanitize extracted and generated content before rendering.
- Surface extraction problems and insufficient evidence. Source support must not be presented as independent factual verification.
- Invalidate dependent activities when material changes or is deleted unless their evidence remains valid.

Source: FR-01–04 and PRD sections 10–11.

## Separate AI generation from application rules

- Follow a fixed read → write → grade → targeted-follow-up teaching pipeline, including P0 scenario and calculation questions.
- Use AI for source-grounded concepts, explanations, questions, rubrics, working-step feedback with uncertainty, practical tasks, and suitable resource matching.
- Keep file validation, local study-space isolation, persistence, deletion, session budgets, review dates, exact multiple-choice grading, and numeric tolerance/unit checks against reviewed keys deterministic. Render LaTeX with safely configured KaTeX; never execute generated expressions using raw `eval`.
- Validate structured AI responses and source references before rendering complete streamed items. Use explicit bounded retries after failures; do not retry automatically on reconnect.
- Keep AI credentials server-side and use a replaceable provider adapter.
- Recommend checked, freely accessible resource links; never invent URLs. Automated Google or YouTube integrations are not required for the MVP.

Source: FR-09 and PRD section 10.

## Protect learning progress and learner control

- Hide answers until submission or deliberate reveal. Record hints, reveals, skips, correctness, and optional confidence distinctly.
- Do not count hinted, revealed, or skipped answers as independent recall success. Exclude flagged activities from scoring until reviewed or regenerated.
- Save each submitted activity before showing completion. Preserve answers on save failure and prevent duplicate attempts on retry.
- Fit suggested activities within the chosen time budget without timing out the learner. Allow skipping, overrides, and early review.
- Use evidence labels and transparent review rules; avoid unsupported mastery percentages and punitive missed-day behavior.

Source: FR-03–07 and PRD section 12.

## Design for access and data control

- Store originals in R2 and chunks, packs, attempts and progress in D1 so learners can continue on any signed-in device. Report save failures and keep the unsent answer for retry. Full offline mode (FR-10) is deferred to P1; do not build service-worker caching or offline-specific controls.
- Provide a readable list alongside the concept map, keyboard access, visible focus, screen-reader labels, readable contrast, and untimed activities.
- Require Google sign-in and collect only provider ID, email and display name. Disclose that selected chunks and answers are sent to the AI provider; original files are stored privately and never sent to the model. Enforce per-user ownership on every route.
- Retain original files locally for revisiting until the learner deletes them. Delete all dependent local records with the study space, cancel related requests where possible, and discard late responses so deletion cannot recreate data.
- Avoid logging raw documents or answers by default. Enforce isolation between learners' study spaces.

Source: FR-11 and PRD sections 8, 12, and 16; FR-10 is deferred.

## Deliver and verify working flows

Follow the PRD milestones: source pipeline, learning loop, continuity, application and access, then demo verification. Finish each milestone with a working flow before broadening scope.

For each change, identify the relevant PRD requirement, check its acceptance criteria, and document what was verified and any remaining limitations. Use automated checks for deterministic rules and data behavior, and learner walkthroughs and content review for generated activities and usability.

Before the demo, verify supported and rejected uploads, valid source links, correct and incorrect answers, hints and reveals, interrupted saves, duplicate submissions, recovery after a gap, network-failure recovery, local storage quota failures, deletion, mobile layouts, and keyboard navigation. Audit generated demo content as described in PRD section 13. Report performance targets and pilot outcomes as measured results only after validation.

Add setup commands, architecture decisions, and coding conventions here as implementation choices are made.
