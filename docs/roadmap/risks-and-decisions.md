# Risks and implementation decisions

This revision records the agreed Cloudflare architecture (required sign-in, D1, R2, AI Gateway) and the deferral of full offline mode to P1; remaining decisions interpret unspecified mechanics. Revisit with evidence and record changes before dependent implementation.

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
| Canonical data | D1 owns all learner records; R2 owns original files; the browser keeps only unacknowledged answer drafts. One database, no MongoDB |
| Identity | Google sign-in required; no guest mode; collect only provider ID, email and display name |
| Network failure | Keep the unacknowledged answer in browser storage and offer explicit retry; attempt IDs make retries idempotent; no queued grading or reconnect replay |
| Deletion | Server removes D1 rows and R2 objects for a space or account; the space is marked deleted first so late AI results are rejected |
| Full offline mode | Deferred P1; self-contained pack JSON keeps future implementation possible without a delivery-time promise |
| Pack size and latency | 3–5 questions; only complete validated items are streamed; at most one next-pack request and one unused prefetched pack |
| Difficult extraction/languages | Limit generation to readable supported English sections; show lost equation/table/diagram or language limitations and invite another supported source |
| Calculation grading | Final number checked locally against a reviewed key with configured absolute/relative tolerance and allow-listed units; model grades working separately; a correct number with flawed working does not advance reasoning progress |
| Model selection | Quality-first comparison of Workers AI candidates through AI Gateway on the same fixtures; per-task routing allowed when measured |
| Resource coverage | Small checked catalog with real URLs and honest no-match for uncovered concepts; no fixed subject curriculum |

## Risk register

| Risk | Owning stage/role | Mitigation and verification |
| --- | --- | --- |
| Provider access or credit unavailable | M0 principal engineer/account owner | Verify Workers AI model access and budget; fake adapter keeps tests moving; no claimed live demo without provider access |
| Model unavailable/poor quality | M0/M2 principal engineer and tester | Compare a smaller and a stronger accessible candidate on the same quantitative and scenario fixtures; pin the winning identifier per task; show insufficient evidence rather than invented answers |
| Wrong calculation keys or garbled notation | M2 tester | Independently check demo keys; numeric checks use reviewed keys only; generate calculations only from readable/corrected notation; flag uncertainty instead of guessing |
| Costs exceed expectation | M0/M2 coder and coordinator | Bounded input/output, concurrency and retries, platform request limits, operator disable switch, billing alerts and measured cost per pack |
| PDF extraction loses meaning | M1/M2 tester | Inspect page-aware text on representative subjects; exclude unsupported content; manually audit generated answers |
| Cross-user data leak | M1 reviewer and tester | Every query and R2 key scoped by server-resolved user ID; tests attempt cross-user reads/writes; private bucket; sanitized rendering; no learner text in Worker or AI Gateway logs |
| Sign-in friction or OAuth setup delays | M0/M1 coder | Google only for P0; keep sign-in to one tap; hosted auth provider as fallback if the library integration stalls |
| Late response restores deleted data | M1/M2 coder and tester | Mark space deleted before cleanup; every AI result write checks space state and material revision |
| Interrupted stream or ambiguous timeout | M2 reviewer/tester | Save validated items as they arrive, explicit retry, idempotent attempt IDs; retry may cause another billed inference |
| D1 limits or migration mistakes | M0/M3 coder | Keep packs as bounded JSON, index by user/space, review migrations, test against a local D1 before deploying |
| AI spend abuse or wasted prefetch | M0/M2 reviewer | Per-user daily quotas in D1, per-task token caps, AI Gateway rate limits, operator kill switch; cap prefetch and measure unused results |
| Time budget becomes a punishment | M3 reviewer | Estimate selection only; no timers, lockouts or forced backlog; ten-minute return scenario |
| Credits or free allowance run out before demo | M0/M5 coordinator | Record expiry/plan status, preserve prepared packs and labelled fallback fixtures; never pass a fixture demonstration off as live generation |
| Scope/infra growth | Every milestone principal engineer | P0 gates, one codebase, small shared modules, avoid vector/agent platform until measured need |

## Open readiness items

- Cloudflare plan, Workers AI model access and AI Gateway setup: **not inspected**.
- Bedrock and other model providers: **outside the hackathon scope by owner decision on 11 October 2026**.
- Actual model quality, latency and cost per pack: **not tested**.
- Hackathon deadline and available team capacity: **not supplied**; do not invent calendar commitments.
- Package versions, auth library integration, browser PDF extraction on a low-end device, and streaming through AI Gateway: **M0 validation pending**.
- Session lifetime and account-deletion flow must be recorded before M1 acceptance.

These do not block committing the plan. They block claims about account funding, deployed capability, or completed implementation, and must be resolved at the corresponding gate.
