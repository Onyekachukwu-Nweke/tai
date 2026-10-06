# PRD acceptance and evidence matrix

All rows are **planned / unverified**. This matrix assigns ownership of requirements; the full acceptance criteria in [PRD v0.2](../../PRD_v2.md) remain authoritative. Link real test/audit results as implementation proceeds.

| Requirement | Delivery | Evidence required before completion |
| --- | --- | --- |
| FR-01 Ingestion | M1 | PDF/TXT valid and invalid fixtures, 10 MB/50-page boundaries in the browser and re-checked by the Worker, original in R2 and chunks in D1 as one revision, stable locations, extraction preview, retry preserves usable state |
| FR-02 Concepts | M2 | 5–15 concepts when supported, selected sections, source evidence, editable labels with unchanged IDs, suggested edges, map/list parity, no forced prerequisites |
| FR-03 Activities | M2 | 3–5 question self-contained packs across 2 selected concepts when supported; prompt/type/IDs/answer or rubric/explanation/source/duration fields; hidden answers; one supported MCQ answer with plausible, unambiguous alternatives; source-grounded scenarios with rubric feedback; calculation items with independently checked keys, local tolerance/unit checks, safe KaTeX rendering and separate working feedback; independent reveal/skip/hint state; uncertain grading; flagged exclusion |
| FR-04 Feedback | M2 | Supported/missing elements and source navigation; source vs supplementary labels; contradictions/uncertainty; challenge without penalty; wrong answer does not prove prerequisite weakness |
| FR-05 Sessions | M3 | 5/15/30 presets, 10-minute recovery, choice/override, budget-fit estimates, due review plus practice when feasible, selection rationale, durable submissions |
| FR-06 Evidence/review | M3 | Labels without mastery percentages; independent outcomes/confidence; fake-clock interval tests; hinted/revealed answers do not advance; overrides; heuristic disclosure |
| FR-07 Return | M3 | Configurable 3-day offer, resume/recovery choices, 5-day simulation, bounded backlog, neutral copy and retained progress |
| FR-08 Practical tasks | M4 | All task fields; suitable source support; simpler task; tools/cost/connectivity disclosure; feasible free alternative; self-reported completion separate; hazardous-task rejection |
| FR-09 Resources | M4 | Real checked free URLs; publisher/channel, concept, language, format, access conditions and checked date; relevance reason; no-match; no autoplay/automatic navigation |
| FR-10 Offline | Deferred (P1) | None for P0. Verify instead that no offline UI or claims ship, and that dropped requests preserve local drafts and progress (FR-05, §12) |
| FR-11 Privacy | M1–M4 | Required Google sign-in with minimal profile data, processing disclosure, original retention until deletion, space and account deletion across D1/R2, no resurrection from late responses, cross-user access tests, server-only credentials, no learner text in Worker/AI Gateway logs |

## Remaining PRD sections

| Sections | Roadmap coverage | Required evidence |
| --- | --- | --- |
| 1–4 Product/users/goals/non-goals | README, scope in every milestone | Own-material learning loop; bounded topic support; no exams/certification, graded-assignment automation or unrestricted execution |
| 5–6 Priorities/journey | M1–M5 | P0 completion before stretch; end-to-end learner walkthrough |
| 8 Screens/accessibility | M1–M4 | All eight screens, keyboard/focus/labels, contrast/non-color cues, large targets, untimed activities, adjustable text and plain language |
| 9 Language/local relevance | M2/M4 | English disclosure, unsupported-language limitation, simpler English, preserved terminology/units/local examples |
| 10 AI/system design | Architecture, M0/M2 | Separate deterministic authority, injection/schema/reference checks, bounded retries, provider adapter and no arbitrary URL fetching |
| 11 Data model | Architecture, M0–M4 | Nine entities, stable IDs, schema versions, source revision invalidation and no sensitive-trait inference |
| 12 Reliability/performance | M1–M5 | Recoverable processing states, small assets, duplicate prevention, durable save, separate measured extraction/generation and device-specific saved-session timing |
| 13 Validation | M5 | Complete demo, 20-item/two-subject audit, actual pilot size/results, no causal learning-effect claim |
| 14 Milestones | Delivery plan | Working exit flow for each stage; source/recall/return preserved when simplifying |
| 15 Risks | Risks and decisions | Named stage ownership and concrete failure checks |
| 16 Confirmed decisions | M0–M5 | PDF/TXT, English, open participant/subject scope, checked free resources, retained originals, basic deletion without production retention project |
| 17 Open implementation choices | Technology decisions, AI provider gate | Exact tested versions, model per task, auth library and resource-link mechanism recorded before live rollout |

## Completion record template

For each work package record: requirement IDs; commit or exact diff; reviewer findings and resolution; tester commands and actual outcomes; manual learner/content checks; environment/model/prompt versions where relevant; missing verification and reason; links to evidence. A checkbox or agent approval without supporting evidence is not a completed acceptance criterion.
