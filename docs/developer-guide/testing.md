# Testing

tai verification should establish that learners can study from their own material, inspect supporting sources, retain progress, and recover from interruptions. Test behavior and important failure modes rather than mirroring implementation details.

## Test layers

- **Unit:** deterministic review rules, session budgeting, activity validation, file limits, attempt outcomes, and error mapping. Inject clocks and provider clients.
- **Contract:** input/output schemas, source-reference validation, and compatibility of persisted local records and self-contained packs.
- **Integration:** extraction, sign-in, D1/R2 storage (local Wrangler bindings), cross-user isolation, deletion, generation validation, duplicate submissions, and interrupted saves using disposable data and fake providers.
- **End-to-end:** upload → preview → concepts → activity → feedback → saved progress → return. Include mobile, keyboard, reload, and network-failure recovery.
- **Content review:** inspect generated questions, explanations, rubrics, and practical tasks against actual source material. Passing a schema check does not establish educational correctness.

Use the smallest layer that demonstrates the behavior, adding broader tests for boundaries and complete journeys. Documentation-only changes generally need link and consistency checks, not application tests.

## Required scenarios by feature

| Area | Verification |
| --- | --- |
| Upload and extraction | Supported PDF/TXT; empty, encrypted, unreadable, scanned, oversized, and unsupported files; actionable errors; existing usable space survives failure |
| Source grounding | Stable references survive extraction; invented citation IDs and malformed AI output are rejected; insufficient evidence is surfaced |
| Activities | Answers hidden initially; correct, incorrect, uncertain, hinted, revealed, skipped, and flagged outcomes handled distinctly |
| Teaching pipeline | Read → write → grade → targeted follow-up works for recall, explanation, scenario, and calculation activities; follow-up responds to the observed answer without inventing a weakness |
| Calculations and notation | Reviewed numeric keys; exact and boundary tolerance cases; equivalent, missing, and incompatible units; malformed/non-finite numbers; ambiguous or incorrect keys yield uncertainty; model working-step feedback matches the rubric; unsafe LaTeX is rejected and valid expressions render in KaTeX without raw evaluation |
| Review and sessions | Configured intervals advance only on independent success; unsuccessful checks reset appropriately; estimates fit budget; overrides work |
| Return flow | Simulated five-day gap yields a manageable recovery session without multiplying overdue work |
| Persistence | Originals, chunks, packs and progress survive reload and are available from a second signed-in device; failed saves keep the unsent answer; retries with the same attempt ID do not duplicate attempts |
| Network resilience | Dropped or interrupted AI requests preserve the local answer and offer explicit retry; reconnection never automatically replays requests; incomplete streamed items are not exposed |
| Pack delivery | Self-contained 3–5 question packs include answers/rubrics, explanations, and source excerpts; MCQs grade locally; at most one bounded next-pack prefetch runs during study |
| Privacy and auth | Unauthenticated requests are rejected; one user cannot read, write or delete another's spaces or R2 files; AI requests accept IDs, not source text; quotas block excess AI calls; secrets stay server-side; Worker and AI Gateway logs omit raw learner material; space/account deletion removes D1 rows and R2 objects |
| Deletion and data loss | Local deletion removes original files and dependent records, discards late AI responses, and cannot recreate a deleted space; browser-data-loss disclosure is visible |
| Accessibility | Keyboard operation, visible focus, accessible names, non-color status cues, readable list alternative, untimed questions, and mobile layout |
| Resources and tasks | Links exist and content is free to access; access conditions are disclosed; tasks include self-check criteria and clear tool/time requirements |

Full offline mode (FR-10) is deferred to P1. P0 verification does not require service-worker caching, saved-pack offline reload, offline status UI, or grading/deletion replay queues.

The PRD proposes 5, 15, and 30 minute presets but also asks for a ten-minute recovery demonstration. Resolve and document how that demo budget is provided before claiming that acceptance scenario passes.

## Test data and AI behavior

Use synthetic or explicitly permitted non-sensitive PDF/TXT fixtures. Include extraction limitations such as tables or equations where relevant. Never commit private learner materials, credentials, or real answers.

Use fake AI responses for repeatable automated checks, including malformed output, invented references, contradictions, and provider failure. Keep any live-provider evaluation separate and document its configuration and costs. Record model and prompt versions for content audits. For model selection, compare Workers AI and Bedrock candidates through AI Gateway using the same two source documents, prompts, task mix, and review rubric. Prioritize measured grounding, teaching quality, scenario/calculation correctness, and appropriate grading uncertainty; record latency, cost, and verified access/capabilities separately. Do not infer quality or capabilities from a model name.

For the demo audit, follow PRD section 13: review at least 20 generated items across two subject areas, verify each source reference, and resolve known critical errors in demo items. Report the actual audit size and findings rather than claiming unperformed validation.

## Tooling and file-size checks

Run `npm run check` for the configured formatting, ESLint, TypeScript, authored-file length, local Markdown links, Vitest Workers tests, and production/dry-run builds. Local and CI use the same command. See [local setup](setup.md) for individual commands and current coverage limits.

The file-size check must fail above 350 physical lines for human- and AI-written software code files. Apply the scope and generated-code exemption in [code-hygiene.md](code-hygiene.md#file-size-and-responsibility). Generated exclusions must be identifiable and reproducible; AI authorship alone is never an exclusion.

## Reliability and reporting

Avoid arbitrary sleeps and blind retries. Use fake clocks, controlled failures, bounded waits, and isolated storage. Treat flaky checks as defects and report any skipped or quarantined coverage explicitly.

For each pull request, state commands and scenarios actually run, their results, and omissions. Coverage percentages alone do not prove correctness. Check deterministic rules and data boundaries directly.

Measure the PRD targets on representative material and a stated device: first small pack within 60 seconds and saved sessions opening within two seconds. Separate extraction and generation measurements. These are prototype targets, not established performance guarantees.
