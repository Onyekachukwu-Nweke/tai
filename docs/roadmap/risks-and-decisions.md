# Risks and implementation decisions

This revision records the agreed deferral of full offline mode to P1 and canonical browser storage in P0; remaining decisions interpret unspecified mechanics. Revisit with evidence and record changes before dependent implementation.

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
| Canonical data | IndexedDB owns originals, chunks, packs, drafts and progress; no learner server database, account system or synchronization |
| Network failure | Preserve locally saved answers and offer explicit retry; no queued grading or reconnect replay |
| Deletion | Transactional local removal; cancel requests and ignore stale callbacks across tabs; no remote deletion queue |
| Full offline mode | Deferred P1; self-contained pack JSON keeps future implementation possible without a delivery-time promise |
| Pack size and latency | 3–5 questions; only complete validated items are streamed; at most one next-pack request and one unused prefetched pack |
| Difficult extraction/languages | Limit generation to readable supported English sections; show lost equation/table/diagram or language limitations and invite another supported source |
| Calculation grading | Final number checked locally against a reviewed key with configured absolute/relative tolerance and allow-listed units; model grades working separately; a correct number with flawed working does not advance reasoning progress |
| Model selection | Quality-first comparison of a smaller and a stronger Bedrock candidate on the same fixtures; per-task routing allowed when measured |
| Resource coverage | Small checked catalog with real URLs and honest no-match for uncovered concepts; no fixed subject curriculum |

## Risk register

| Risk | Owning stage/role | Mitigation and verification |
| --- | --- | --- |
| AWS credit unavailable or ineligible | M0 principal engineer/account owner | Verify billing grant and selected service/model coverage; fake adapter keeps local work moving; no claimed live demo without provider access |
| Model unavailable/poor quality | M0/M2 principal engineer and tester | Compare a smaller and a stronger accessible candidate on the same quantitative and scenario fixtures; pin the winning identifier per task; show insufficient evidence rather than invented answers |
| Wrong calculation keys or garbled notation | M2 tester | Independently check demo keys; numeric checks use reviewed keys only; generate calculations only from readable/corrected notation; flag uncertainty instead of guessing |
| Costs exceed expectation | M0/M2 coder and coordinator | Bounded input/output, concurrency and retries, platform request limits, operator disable switch, billing alerts and measured cost per pack |
| PDF extraction loses meaning | M1/M2 tester | Inspect page-aware text on representative subjects; exclude unsupported content; manually audit generated answers |
| Local or transmitted data leak | M1/M2 reviewer | Originals stay local; bounded excerpts and explicit disclosures; sanitize rendering, prevent AI payload logging/caching, explain shared-browser access |
| Late response restores deleted data | M1/M2 coder and tester | Cancel requests and check local space/revision in every write transaction; test deletion in another tab |
| Interrupted stream or ambiguous timeout | M2 reviewer/tester | Save draft/validated items, explicit retry, stable local IDs and no duplicate attempts; retry may cause another billed inference |
| Browser storage cleared/full | M1/M3 tester | Transactional local writes, save-failure messages, normal reload tests and honest data-loss disclosure |
| Public endpoint abuse or wasted prefetch | M0/M2 reviewer | Enforce request/token/concurrency/time limits, deployment-level throttling and operator disable switch; CORS is not authorization; cap prefetch and measure unused results |
| Time budget becomes a punishment | M3 reviewer | Estimate selection only; no timers, lockouts or forced backlog; ten-minute return scenario |
| Credits expire before demo | M0/M5 coordinator | Record expiry/plan status, preserve prepared packs and labelled fallback fixtures; never pass a fixture demonstration off as live generation |
| Scope/infra growth | Every milestone principal engineer | P0 gates, one codebase, small shared modules, avoid vector/agent platform until measured need |

## Open readiness items

- AWS account creation date, plan, credit balance, grant exclusions and expiration: **not inspected**.
- Preferred deployment region, available model identifiers/quotas, inference-profile routing, and actual quality/latency: **not tested**.
- Hackathon deadline and available team capacity: **not supplied**; do not invent calendar commitments.
- Runtime/package versions, PDF packaging behavior and supported target browser/device: **M0 validation pending**.
- Streaming transport/model support, platform abuse controls and browser storage limits must be validated before public use. No login or guest-cookie persistence is planned.

These do not block committing the plan. They block claims about account funding, deployed capability, or completed implementation, and must be resolved at the corresponding gate.
