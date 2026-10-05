# TAI development roadmap

**Planning baseline:** 5 October 2026 · **Specification:** [PRD v0.2](../../PRD_v2.md) · **Implementation status:** not started.

Full offline mode is deferred to P1. P0 keeps low data use, canonical IndexedDB persistence, local extraction and grading, and explicit retry after failed AI requests. The AI server is stateless.

This roadmap translates the complete PRD into an architecture, proposed technology baseline, ordered delivery stages, and acceptance gates. Committing it records the plan; it does not establish deployed infrastructure, available AWS credit, or passing application tests.

## Read in this order

1. [Architecture](architecture.md): system boundaries, data ownership, canonical browser storage and request-failure behavior, and security.
2. [Technology decisions](technology-decisions.md): recommended stack, alternatives, and decisions to validate.
3. [Bedrock and AWS readiness](bedrock-and-budget.md): credits, access, model evaluation, and spending controls.
4. [Delivery plan](delivery-plan.md): milestones, dependencies, work packages, and exit criteria.
5. [Acceptance matrix](acceptance-matrix.md): PRD coverage and required evidence.
6. [Risks and decisions](risks-and-decisions.md): explicit product-rule interpretations and unresolved readiness checks.

## Delivery sequence

```text
M0 Foundation and AWS feasibility
  → M1 Source pipeline
  → M2 Learning loop
  → M3 Continuity
  → M4 Practical tasks, resources, and accessibility
  → M5 Demo verification and learner walkthroughs
```

M0 establishes development tooling and validates deployment assumptions. M1–M5 implement the PRD's five milestones. Accessibility, privacy, source traceability, and error handling start with their owning feature; they are not deferred to a final polish phase.

No calendar deadline or team capacity has been supplied. Sequence by exit criteria rather than invented dates. Re-estimate after M0 and each completed milestone. Each stage is currently **not started**; research in this folder is planning evidence only.

## Working agreement

Use the [agent workflow](../developer-guide/agent-workflow.md). The principal engineer scopes a work package, the coder implements it, reviewer and tester independently assess the same revision, and the coordinator integrates fixes. Assign one writer per file. Every authored code file stays within 350 physical lines.

Create a focused branch and pull request for each coherent work package. Include the requirement IDs, acceptance evidence, and unresolved limitations. Do not advance a milestone while its required behavior is missing. If time runs short, simplify the map and use manually checked resource links; do not silently remove P0 source references, recall, return, local progress, or deletion.

## First implementation task

Start M0 with a thin web/API skeleton, versioned contracts, fake AI adapter, and automated checks. In parallel, the account owner verifies AWS plan, usable credits, model access, region, and spending ceiling. Local implementation can proceed with fake responses if AWS access is unresolved; a live AI demo cannot be marked ready until the Bedrock gate passes.

## Connectivity story for the demo

Show measured low data use: bounded selected excerpts rather than PDFs, small 3–5-question self-contained packs, no autoplay videos or heavy decorative assets, and locally saved progress and answer drafts. A dropped AI request offers explicit retry without erasing a successfully saved answer. Full offline launch/reload is a later milestone; do not imply it already works. Measure actual payloads before claiming a specific number of kilobytes.
