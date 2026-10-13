# TAI development roadmap

**Planning baseline:** 5 October 2026 · **Specification:** [PRD v0.2](../../PRD_v2.md) · **Implementation status:** M0 foundation in progress.

TAI runs on Cloudflare: one Worker (web app + API), required Google sign-in, D1 as the single database, R2 for original files, and AI Gateway in front of Workers AI. Bedrock and other model providers are outside the hackathon scope. Full offline mode is deferred to P1.

This roadmap translates the complete PRD into an architecture, proposed technology baseline, ordered delivery stages, and acceptance gates. Committing it records the plan; it does not establish deployed infrastructure, available credit, or passing application tests.

## Read in this order

1. [Architecture](architecture.md): system boundaries, sign-in and ownership, D1/R2 storage, teaching pipeline, and failure handling.
2. [Technology decisions](technology-decisions.md): recommended stack, alternatives, and decisions to validate.
3. [AI provider and budget](ai-provider-and-budget.md): Workers AI model evaluation, quotas and spending controls.
   Local quota behavior is recorded in [per-user AI quota evidence](ai-quota-evidence.md).
4. [Delivery plan](delivery-plan.md): milestones, dependencies, work packages, and exit criteria.
5. [Acceptance matrix](acceptance-matrix.md): PRD coverage and required evidence.
6. [Risks and decisions](risks-and-decisions.md): explicit product-rule interpretations and unresolved readiness checks.
7. [Development handover](development-handover.md): current revision, implemented scope, open gates, and the recommended resume sequence.

Current local implementation and checks: [M0 foundation evidence](m0-foundation-evidence.md), [Workers AI provider evidence](m0-workers-ai-evidence.md), [live-provider evaluation procedure](live-provider-evaluation.md), [browser extraction evidence](m0-extraction-evidence.md), [material persistence evidence](m1-material-persistence-evidence.md), [M2.1 concept evidence](m2-concept-organization-evidence.md), [M2.2 activity-pack evidence](m2-activity-pack-evidence.md), [M2 tutor evidence](m2-activity-tutor-evidence.md), [M2 rubric-grading evidence](m2-rubric-grading-evidence.md), [M2 scenario evidence](m2-scenario-activity-evidence.md), [M2 calculation evidence](m2-calculation-evidence.md), [M2 targeted follow-up evidence](m2-targeted-followup-evidence.md), [M3 concept-progress evidence](m3-concept-progress-evidence.md), [M3.1 study-session evidence](m3-study-session-evidence.md), [M3.4 recovery-session evidence](m3-recovery-session-evidence.md), [M4.1 practical-task evidence](m4-practical-task-evidence.md), [M4.2 resource-catalog evidence](m4-resource-catalog-evidence.md), [M4.3 account-deletion evidence](m4-account-deletion-evidence.md), and [M4.4 accessibility/language evidence](m4-accessibility-language-evidence.md).

## Delivery sequence

```text
M0 Foundation, sign-in, and provider feasibility
  → M1 Source pipeline
  → M2 Learning loop
  → M3 Continuity
  → M4 Practical tasks, resources, and accessibility
  → M5 Demo verification and learner walkthroughs
```

M0 establishes development tooling and validates deployment assumptions. M1–M5 implement the PRD's five milestones. Accessibility, privacy, source traceability, and error handling start with their owning feature; they are not deferred to a final polish phase.

No calendar deadline or team capacity has been supplied. Sequence by exit criteria rather than invented dates. Re-estimate after M0 and each completed milestone. M0 and M1 remain **in progress**; M2 is **in progress** with deterministic concepts and activities; M3 is **in progress** with saved attempts, concept review projections, persisted budgeted sessions and a bounded recovery flow; M4 is **in progress** with application-controlled account deletion, live practical tasks, a checked supplementary-resource catalog, local text-size settings and explicit English-only guidance; M5 is **not started**. See [local setup](../developer-guide/setup.md) for the current implementation scope. The first bounded live-provider comparison rejected both model candidates on pack quality and led to stronger fail-closed validation; model selection, deployed behavior and representative-device readiness remain open.

## Working agreement

Use the [agent workflow](../developer-guide/agent-workflow.md). The principal engineer scopes a work package, the coder implements it, reviewer and tester independently assess the same revision, and the coordinator integrates fixes. Assign one writer per file. Every authored code file stays within 350 physical lines.

Create a focused branch and pull request for each coherent work package. Include the requirement IDs, acceptance evidence, and unresolved limitations. Do not advance a milestone while its required behavior is missing. If time runs short, simplify the map and use manually checked resource links; do not silently remove P0 source references, recall, return, saved progress, or deletion.

## First implementation task

Start M0 with a thin Worker + React skeleton, Google sign-in, one application table in D1 (plus auth tables), versioned contracts, fake AI adapter and automated checks. In parallel, the account owner sets up Workers AI, AI Gateway with body logging disabled, and a spending ceiling. Development proceeds with fake responses until the provider is ready; a live AI demo cannot be marked ready until the [AI provider gate](ai-provider-and-budget.md) passes.

## Connectivity story for the demo

Show measured low data use: the PDF is uploaded once; AI requests send only IDs because the Worker reads chunks from D1; packs are small 3–5-question JSON documents; no autoplay videos or heavy decorative assets. A dropped request keeps the unsent answer in the browser for explicit retry, and saved progress is available from any signed-in device. Full offline launch/reload is a later milestone; do not imply it already works. Measure actual payloads before claiming a specific number of kilobytes.
