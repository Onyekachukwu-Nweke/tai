# Delivery plan

Every milestone is **not started**. These work packages define implementation order and evidence; they are not claims of completed work. Use the [acceptance matrix](acceptance-matrix.md) with the full PRD criteria.

## M0 — Foundation and feasibility

**Dependencies:** none. **Primary owner:** principal engineer; coder scaffolds after the brief.

- M0.1: Pin compatible runtime/dependencies; create web/API/domain skeleton, fake provider, shared schemas, formatter/linter/type checks and 350-line check. Document real setup commands.
- M0.2: Resolve AWS account/credit/model/region questions using the [Bedrock gate](bedrock-and-budget.md). Run a bounded synthetic invocation only during authorized implementation, not as part of this planning commit.
- M0.3: Spike PDF text extraction and page references on small representative files. Verify Lambda packaging, direct-upload design and resumable job contract.
- M0.4: Define guest ownership, operation IDs, job state, offline-pack manifest, deletion protocol, evidence outcomes and infrastructure template boundaries.

**Exit:** reproducible local skeleton and tests; validated contract examples; written spike results and actual model/region/budget decision. If AWS access is blocked, explicitly leave that gate open while fake-provider development proceeds. No paid deployment is implied by the roadmap.

## M1 — Source pipeline

**Depends on:** M0 contracts/tooling. **Coverage:** FR-01, FR-11 foundation; Home, Material review, basic Settings.

- M1.1: Guest session and owner-scoped study-space CRUD, disclosure, upload intent and direct private storage. One material per space; retain originals.
- M1.2: Validate actual file bytes/size and PDF page count, extract stable source chunks, report scanned/encrypted/empty/unsupported/oversized failures, and preview page/section evidence.
- M1.3: Retry without losing usable data; durable processing status; source download and online deletion across stored copies; initial keyboard/mobile states.

**Exit demo:** a learner uploads PDF and TXT, inspects page/section references and warnings, revisits the original, and deletes the space. Another guest cannot access its records or object URLs. Invalid uploads fail recoverably. Defaults 10 MB/50 pages are enforced client and server.

**Verification:** parser fixtures, limit boundaries, ownership, duplicate finalization, deletion during extraction, interrupted upload and safe rendering.

## M2 — Learning loop

**Depends on:** M1 evidence and ownership; live generation needs M0 Bedrock access. **Coverage:** FR-02–04; Concept explorer and Activity.

- M2.1: Selected-section retrieval and roughly 5–15 source-backed editable concepts; preserve IDs and show suggested edges distinctly. Provide map/list parity and no prerequisite locks.
- M2.2: Generate small reusable packs: at least three questions across two selected concepts when material supports it, with all required fields. Validate JSON shape, concept membership, citation IDs, revision, and response bounds.
- M2.3: Hidden answers, hints, deliberate reveal, skip, MCQ scoring, recall self-check and online rubric feedback with uncertain outcome. Show supported/missing elements and clickable source excerpts.
- M2.4: Flag/challenge without penalty; block flagged content from future scoring; distinguish supplementary explanation from source-supported content. Persist packs and attempts using versioned contracts.

**Exit demo:** own material produces concepts and questions; correct and incorrect answers show honest source-linked feedback; malformed provider output and insufficient evidence produce a limitation rather than fabricated support.

**Verification:** fake-provider failures/injection, invented citations, lost extraction meaning, one supported MCQ answer with plausible unambiguous alternatives, rubric uncertainty, hidden answers, flags, identity-preserving edits. Inspect a small sample manually before broadening generation.

## M3 — Continuity

**Depends on:** M2 activities/attempts. **Coverage:** FR-05–07; Today's session and Session summary.

- M3.1: Session presets 5/15/30 minutes plus a 10-minute recovery option; learn/review/practise choice; explain selection, allow overrides, fit estimated budget without timing out learners.
- M3.2: Persist submissions before completion; retry with stable attempt IDs. Establish IndexedDB outbox and deterministic local projection here so offline work does not require rewriting progress later.
- M3.3: Implement evidence labels and review policy from [decisions](risks-and-decisions.md); separate correctness, hints/reveals, confidence and timestamps. Fake clocks cover 1/3/7/14-day intervals.
- M3.4: Resume unfinished work or build a short session after configurable inactivity. No forced backlog or broken-streak penalty.

**Exit demo:** simulate five days away and offer a manageable ten-minute recovery session. Reload/retry does not lose or duplicate completed work; hinted answers do not extend review intervals.

**Verification:** budget boundaries, due review plus practice, uncertain/flagged evidence, duplicate/out-of-order replay, storage failure, browser interruption and gap simulation.

## M4 — Application and access

**Depends on:** M2 packs and M3 persistence. Practical-task/resource catalog work can proceed independently of offline implementation with separate file ownership. **Coverage:** FR-08–11 completion, Resources and Settings, accessibility/language completion.

- M4.1: Source-grounded practical tasks with objective, instructions, output, tools, duration and self-check; simpler variant, costs/connectivity disclosure, feasible free alternative; no hazardous procedures. Record completion separately from quiz evidence.
- M4.2: Dated checked resource catalog with all metadata, relevance reason, free/access disclosure and honest no-match. No autoplay or automatic external navigation.
- M4.3: Explicit offline-pack save, atomic manifest completion, app-shell caching, saved sources/rationales/concepts, offline reload and local submissions. Free text is pending online feedback or labelled self-check.
- M4.4: Offline deletion queue, online cleanup acknowledgment, anti-resurrection checks, storage/quota warnings and clear-browser-data disclosure.
- M4.5: Complete keyboard, focus, labels, contrast, touch targets, text sizing and plain-language flows. Disclose English-only support and actionable unsupported-language limitations, preserve terminology/units, label supplementary examples and support simpler English.

**Exit demo:** saved study works without connectivity after reload; submissions persist; practical exercise and checked resource are available for suitable concepts; delete/clear-all correctly reports local versus server completion.

**Verification:** offline restart, quota exhaustion, partially saved packs, schema updates, delayed job writes after deletion, pending-upload expiry, mobile/keyboard review and resource metadata audit.

## M5 — Demo verification

**Depends on:** all P0 exit gates. **Coverage:** full acceptance matrix and PRD sections 12–13.

- Audit at least 20 generated items across two subjects; resolve every known critical error in demo items, with actual source references and findings recorded.
- Run the complete learner journey, both answer outcomes, practical task/resource, five-day gap/ten-minute recovery, offline reload/progress, and deletion.
- Measure first small pack preparation toward 60 seconds, extraction and generation separately, and saved-session opening toward two seconds on a stated device/network.
- Exercise invalid uploads, provider unavailability, budget denial, duplicate submissions, interrupted writes, ownership boundaries and malicious content.
- Aim for five available learners if time permits; report actual participant count, task completion, ability to explain recommendations/find sources, and restart manageability. Smaller pilots are acceptable and must be labelled.
- Record exact revision, model/prompt/rule versions, test commands/results, measured latency/cost, known limitations and demo steps in a dated evidence document linked from this roadmap.

**Exit:** evidence supports each demo criterion; no known critical demo content error; unresolved limitations are visible and do not masquerade as completed P0 behavior. Do not claim proven retention improvement from completion or satisfaction.

## After the hackathon

Only after P0 works, consider P1 learning puzzles. Live verified resource search and opportunity pathways are P2. OCR, additional formats/languages, accounts, cross-device sync, advanced adaptation and production retention policies require a later scope decision.
