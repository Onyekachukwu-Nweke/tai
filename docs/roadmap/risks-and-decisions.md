# Risks and implementation decisions

These decisions interpret unspecified mechanics without changing the PRD's product scope. Revisit with evidence and record changes before dependent implementation.

## Proposed default rules

| Question | Implementation baseline |
| --- | --- |
| Ten-minute recovery vs 5/15/30 presets | Add an explicit 10-minute recovery option so the section 13 demo is supported; generic custom budgets remain optional |
| Review interval after failure | Independent incorrect outcome resets to 1 day; successive eligible independent successes schedule 1, 3, 7, then 14 days; further successes stay at 14 days |
| Hints/reveals/skips/uncertainty | Never advance the interval. Hint/reveal requests another independent check; skipped and uncertain outcomes are not successes or automatic failures |
| Recall self-check | Label learner-reported evidence separately and do not advance scored review steps; an independently assessed MCQ or supported rubric outcome can advance them |
| Flagged items | Exclude future scoring and remove their evidence from progress projection; recompute affected progress without punitive learner messaging |
| Practical completion | Learner-reported and separate from quiz correctness and scored review steps |
| Material replacement | MVP uses a new study space for a new material. Reprocessing retains revision IDs and invalidates evidence whose source no longer exists |
| Concept label edits | Preserve concept ID and source association; do not regenerate IDs based on display titles |
| Review dates | Store UTC instants, display local time, use an injected clock and fixed day durations initially; explain recommendations as heuristics |
| Offline data | One-device pending-operation replay; no account recovery or cross-device conflict-resolution promise |
| Offline deletion | Immediate local removal, pending authenticated server deletion, deletion before queued writes; never claim server removal before acknowledgment |
| Difficult extraction/languages | Limit generation to readable supported English sections; show lost equation/table/diagram or language limitations and invite another supported source |
| Resource coverage | Small checked catalog with real URLs and honest no-match for uncovered concepts; no fixed subject curriculum |

## Risk register

| Risk | Owning stage/role | Mitigation and verification |
| --- | --- | --- |
| AWS credit unavailable or ineligible | M0 principal engineer/account owner | Verify billing grant and selected service/model coverage; fake adapter keeps local work moving; no claimed live demo without provider access |
| Model unavailable/poor quality | M0/M2 principal engineer and tester | Compare accessible candidates on the same source fixtures; pin winning identifier; show insufficient evidence rather than invented answers |
| Costs exceed expectation | M0/M2 coder and coordinator | Bounded input/output, concurrency and retries, budget ledger, application deny switch, billing alerts and measured cost per pack |
| PDF extraction loses meaning | M1/M2 tester | Inspect page-aware text on representative subjects; exclude unsupported content; manually audit generated answers |
| Guest-data leak | M1 reviewer | Authorize all resources and signed URLs, same-origin cookie/CSRF tests, private buckets and sanitized rendering |
| Upload replay/deletion race | M1/M4 coder and tester | Immutable finalized sources, job revision checks, tombstones, pending URL expiry and deletion cleanup tests |
| Queue redelivery/ambiguous timeout | M2 reviewer/tester | Conditional job claim, operation IDs, bounded retries, explicit unknown/failed state, no duplicate publish |
| Offline storage cleared/full | M3/M4 tester | Transactional pack/attempt saves, quota messages, reload tests, clear-data and pending-delete disclosures |
| Time budget becomes a punishment | M3 reviewer | Estimate selection only; no timers, lockouts or forced backlog; ten-minute return scenario |
| Credits expire before demo | M0/M5 coordinator | Record expiry/plan status, preserve prepared packs and labelled fallback fixtures; never pass a fixture demonstration off as live generation |
| Scope/infra growth | Every milestone principal engineer | P0 gates, one codebase, small shared modules, avoid vector/agent platform until measured need |

## Open readiness items

- AWS account creation date, plan, credit balance, grant exclusions and expiration: **not inspected**.
- Preferred deployment region, available model identifiers/quotas, inference-profile routing, and actual quality/latency: **not tested**.
- Hackathon deadline and available team capacity: **not supplied**; do not invent calendar commitments.
- Runtime/package versions, PDF packaging behavior and supported target browser/device: **M0 validation pending**.
- Guest-cookie lifetime and lost-session handling must be recorded before M1 retention/deletion acceptance.

These do not block committing the plan. They block claims about account funding, deployed capability, or completed implementation, and must be resolved at the corresponding gate.
