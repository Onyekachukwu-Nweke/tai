# Developer guide

Development guidelines for tai:

- [Code hygiene](code-hygiene.md): file responsibilities, the 350-line limit, and safe data handling.
- [Development](development.md): scope, implementation boundaries, and workflow.
- [Git branching](git-branching.md): branch naming and lifecycle.
- [Pull requests and commits](pr-commits.md): commit conventions and verification evidence.
- [Code review](review.md): review priorities and acceptance checks.
- [Testing](testing.md): test layers, learner scenarios, and content audits.

This guide translates the [v0.2 PRD](../../PRD_v2.md) into initial development guidelines. Refer to the PRD for full acceptance criteria; this guide does not replace them. Framework, AI provider, storage, and hosting choices remain open.

## Build within the agreed scope

- Prioritize the P0 learner journey: upload material, inspect extracted content, select concepts, complete activities, receive feedback, save progress, and return to study.
- Accept text-based PDF and TXT files only, with one material per study space. Use English for the hackathon interface and generation.
- Keep proposed limits configurable: 10 MB uploads, 50 pages per PDF, review intervals of 1, 3, 7, and 14 days, and a three-day return-flow threshold.
- Keep OCR, additional formats and languages, cross-device synchronization, and offline AI generation outside the hackathon scope.

Source: PRD sections 5, 7, 9, and 16–17.

## Preserve source traceability

- Keep stable IDs linking material, extracted chunks, concepts, activities, and attempts. Version persisted schemas.
- Include supporting source references in generated concepts, questions, and feedback. Validate cited IDs against actual extracted chunks before saving a pack.
- Treat uploaded text as untrusted content, never as instructions. Sanitize extracted and generated content before rendering.
- Surface extraction problems and insufficient evidence. Source support must not be presented as independent factual verification.
- Invalidate dependent activities when material changes or is deleted unless their evidence remains valid.

Source: FR-01–04 and PRD sections 10–11.

## Separate AI generation from application rules

- Use AI for source-grounded concepts, explanations, questions, rubrics, practical tasks, and suitable resource matching.
- Keep file validation, access control, persistence, deletion, session budgets, review dates, and exact multiple-choice grading deterministic.
- Validate structured AI responses and source references, bound retries, and provide a recoverable failure state.
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

- Make explicitly saved packs and local progress usable offline after reload. Clearly identify operations that require connectivity and report storage failures.
- Provide a readable list alongside the concept map, keyboard access, visible focus, screen-reader labels, readable contrast, and untimed activities.
- Support a single-device guest flow and disclose AI processing before sending material or answers to the provider.
- Retain uploaded files for revisiting until the learner deletes them. Deleting a study space must remove its application-controlled source files, extracted content, activities, and attempts.
- Avoid logging raw documents or answers by default. Enforce isolation between learners' study spaces.

Source: FR-10–11 and PRD section 8.

## Deliver and verify working flows

Follow the PRD milestones: source pipeline, learning loop, continuity, application and access, then demo verification. Finish each milestone with a working flow before broadening scope.

For each change, identify the relevant PRD requirement, check its acceptance criteria, and document what was verified and any remaining limitations. Use automated checks for deterministic rules and data behavior, and learner walkthroughs and content review for generated activities and usability.

Before the demo, verify supported and rejected uploads, valid source links, correct and incorrect answers, hints and reveals, interrupted saves, duplicate submissions, recovery after a gap, offline reload, deletion, mobile layouts, and keyboard navigation. Audit generated demo content as described in PRD section 13. Report performance targets and pilot outcomes as measured results only after validation.

Add setup commands, architecture decisions, and coding conventions here as implementation choices are made.
