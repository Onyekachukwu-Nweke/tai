# Delivery plan

M0 is **in progress**, with the local authenticated study-space foundation and browser extraction preview; M1 is **in progress** with material storage and deletion; M2 is **in progress** with source-linked concepts and deterministic activities; M3 is **in progress** with saved attempts and concept review projections; M4–M5 are **not started**. No milestone exit gate is complete. These work packages define implementation order and evidence; they are not claims of completed work. Use the [acceptance matrix](acceptance-matrix.md) with the full PRD criteria.

## M0 — Foundation and feasibility

**Dependencies:** none. **Primary owner:** principal engineer; coder scaffolds after the brief.

- M0.1: Pin compatible runtime/dependencies; create web app, Worker API and domain skeleton with Wrangler, D1 migrations, fake provider, shared schemas, formatter/linter/type checks and 350-line check. Document real setup commands. Aim for a running vertical slice early: sign in → import text → concepts → one question → answer → saved in D1.
- M0.2: Set up Google sign-in (Better Auth on D1), AI Gateway, and Workers AI and Bedrock access; resolve account/credit/model questions using the [AI provider gate](ai-provider-and-budget.md). Run a bounded synthetic invocation only during authorized implementation, not as part of this planning commit.
- M0.3: Spike in-browser PDF.js extraction and page references on small representative files, including a 50-page PDF on a low-end Android device and a math-heavy page. Verify streaming from a model through AI Gateway and the Worker to the browser.
- M0.4: Define the D1 schema and migrations, R2 key layout, AI task-kind request/response schemas (concepts, pack, grade, followup, hint, explain_again, practical_task), pack JSON, numeric key/tolerance/unit format, evidence outcomes and per-user AI quotas.

**Exit:** reproducible local skeleton and tests; validated contract examples; written spike results and actual model/region/budget decision. If provider access is blocked, explicitly leave that gate open while fake-provider development proceeds. No paid deployment is implied by the roadmap.

## M1 — Source pipeline

**Depends on:** M0 contracts/tooling. **Coverage:** FR-01, FR-11 foundation; Home, Material review, basic Settings.

- M1.1: Required sign-in; owner-scoped study-space CRUD in D1; processing disclosure; browser PDF/TXT import. One material per space; original stored in R2.
- M1.2: Validate actual file bytes/size and PDF page count in the browser, extract stable source chunks, upload original and chunks as one material revision with server-side re-validation, report scanned/encrypted/empty/unsupported/oversized failures, and preview page/section evidence. Let learners explicitly fetch and render a saved PDF one page at a time beside its canonical extracted-text alternative.
- M1.3: Retry without losing usable data; processing status; reopen the original through the Worker; server deletion of D1 rows and R2 objects; initial keyboard/mobile states.

**Exit demo:** a signed-in learner imports PDF and TXT, inspects page/section references and warnings, revisits the original from another device, and deletes the space. Another user cannot read its records or files. Invalid imports fail recoverably. Defaults 10 MB/50 pages are enforced in the browser and re-checked by the Worker.

**Verification:** parser fixtures, limit boundaries, cross-user access attempts, unauthenticated requests, deletion during extraction, interrupted upload and safe rendering.

## M2 — Learning loop

**Depends on:** M1 source chunks; live generation needs M0 provider access. **Coverage:** FR-02–04; Concept explorer and Activity.

- M2.1: Selected-section retrieval and roughly 5–15 source-backed editable concepts; preserve IDs and show suggested edges distinctly. Provide map/list parity and no prerequisite locks.
- M2.2: Generate self-contained 3–5 question packs across at least two selected concepts when material supports it, mixing recall, MCQ, explain, scenario and calculation/equation types as the source allows. Validate JSON shape, concept membership, citation IDs, revision, response bounds, and numeric keys/tolerances/units.
- M2.3 (in progress): Hidden recall/MCQ review keys, deliberate reveal, skip, deterministic MCQ checks, recall self-check, saved explanations and scenario responses, explicit source-grounded hints and alternate explanations, and bounded source-grounded explanation/scenario rubric feedback are implemented with fake providers. Numeric checks, calculation working and live-provider quality remain.
- M2.3b (in progress): Learner-requested targeted follow-up now generates and saves one source-grounded practice prompt for a deterministic gap in ready explanation/scenario rubric feedback. Follow-up answer submission/grading, session/cost-budget integration and live-provider quality remain.
- M2.4: Flag/challenge without penalty; block flagged content from future scoring; distinguish supplementary explanation from source-supported content. Persist packs and attempts using versioned contracts.

**Exit demo:** own material produces concepts and questions; correct and incorrect answers show honest source-linked feedback; malformed provider output and insufficient evidence produce a limitation rather than fabricated support.

**Verification:** fake-provider failures/injection, invented citations, lost extraction meaning (especially garbled equations), one supported MCQ answer with plausible unambiguous alternatives, numeric tolerance/unit boundaries and malformed numbers, correct number with flawed working, unsafe LaTeX rejection, rubric uncertainty, hidden answers, flags, identity-preserving edits. Run the smaller-vs-stronger model comparison from the [AI provider gate](ai-provider-and-budget.md) and inspect a small sample manually before broadening generation.

## M3 — Continuity

**Depends on:** M2 activities/attempts. **Coverage:** FR-05–07; Today's session and Session summary.

- M3.1 (in progress): Persisted 5/15/30-minute learn/review/practise sessions select from the current saved pack, explain each choice, support a concept override and fit the estimate within the budget without timing learners. The 10-minute recovery option remains with M3.4.
- M3.2 (in progress): Attempts persist before completion with stable IDs, immutable replay and explicit browser-draft retry. Atomic progress writes remain for M3.3.
- M3.3 (in progress): Deterministic, unflagged MCQ evidence now drives concept labels and the 1/3/7/14-day review projection. Neutral evidence, atomic writes, retroactive flag exclusion and fake-clock boundaries are covered. Overrides and later assessed activity types remain.
- M3.4 (in progress): After configurable inactivity, restore an unfinished current-pack session or build a fixed 10-minute review of at most three useful checks. Saved-pack selection does not multiply work by missed days or impose a streak penalty.

**Exit demo:** simulate five days away and offer a manageable ten-minute recovery session. Reload/retry does not lose or duplicate completed work; hinted answers do not extend review intervals.

**Verification:** budget boundaries, due review plus practice, uncertain/flagged evidence, duplicate submissions, dropped requests, storage failure, browser interruption and gap simulation.

## M4 — Application and access

**Depends on:** M2 packs and M3 persistence. Practical-task and resource catalog work can proceed in parallel with separate file ownership. **Coverage:** FR-08, FR-09, FR-11 completion, Resources and Settings, accessibility/language completion.

- M4.1: Source-grounded practical tasks with objective, instructions, output, tools, duration and self-check; simpler variant, costs/connectivity disclosure, feasible free alternative; no hazardous procedures. Record completion separately from quiz evidence.
- M4.2: Dated checked resource catalog with all metadata, relevance reason, free/access disclosure and honest no-match. No autoplay or automatic external navigation.
- M4.3: Account deletion and delete-all-data; deleted spaces reject late AI results; per-user quota messages; provider-processing disclosure.
- M4.4: Complete keyboard, focus, labels, contrast, touch targets, text sizing and plain-language flows. Disclose English-only support and actionable unsupported-language limitations, preserve terminology/units, label supplementary examples and support simpler English.

**Exit demo:** submissions persist across reloads and dropped requests; practical exercise and checked resource are available for suitable concepts; account and space deletion remove D1 and R2 data and late responses do not recreate it.

**Verification:** quota exhaustion, partially generated packs, schema migrations, late responses after deletion, mobile/keyboard review and resource metadata audit.

## M5 — Demo verification

**Depends on:** all P0 exit gates. **Coverage:** full acceptance matrix and PRD sections 12–13.

- Audit at least 20 generated items across two subjects; resolve every known critical error in demo items, with actual source references and findings recorded.
- Run the complete learner journey, both answer outcomes, practical task/resource, scenario and calculation activities, hint/alternate explanation, five-day gap/ten-minute recovery, reload and dropped-request recovery, and deletion.
- Measure first small pack preparation toward 60 seconds, extraction and generation separately, and saved-session opening toward two seconds on a stated device/network.
- Exercise invalid uploads, provider unavailability, budget denial, duplicate submissions, interrupted writes, unauthenticated and cross-user requests, quota limits and malicious content.
- Aim for five available learners if time permits; report actual participant count, task completion, ability to explain recommendations/find sources, and restart manageability. Smaller pilots are acceptable and must be labelled.
- Record exact revision, model/prompt/rule versions, test commands/results, measured latency/cost, known limitations and demo steps in a dated evidence document linked from this roadmap.

**Exit:** evidence supports each demo criterion; no known critical demo content error; unresolved limitations are visible and do not masquerade as completed P0 behavior. Do not claim proven retention improvement from completion or satisfaction.

## After the hackathon

Only after P0 works, consider P1 learning puzzles. Live verified resource search and opportunity pathways are P2. OCR, additional formats/languages, accounts, cross-device sync, advanced adaptation and production retention policies require a later scope decision.
