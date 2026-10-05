# TAI — Product Requirements Document

**Version:** 0.2 · **Date:** 5 October 2026 · **Status:** Draft for hackathon implementation

**Scope revision:** Canonical browser-local storage and low-data online AI replace P0 offline packs. FR-10 is deferred to P1. Scenario-based and calculation/equation questions are P0 where source evidence supports them.

## 1. Product summary

TAI is a self-directed learning companion that turns a learner’s own course materials into manageable, active learning experiences. Learners bring notes or course documents; TAI helps them identify concepts, check understanding, practise applying ideas, revisit material, and resume after interruptions.

**Product promise:** Bring your material. Understand it, practise it, and keep learning.

TAI is not restricted to introductory statistics or a predefined curriculum. The prototype supports a bounded set of document formats across subjects, with explicit limits when material cannot be reliably interpreted.

## 2. Problem and intended users

Self-directed learners often have materials but lack a clear way to use them effectively. Reading can feel productive without revealing understanding gaps. Learners may not know what to practise, when to review, or how to restart after missed sessions. Limited mobile data, unreliable connectivity, and unfamiliar terminology can compound these difficulties.

Primary users are students and independent learners across Africa who already have course materials and need help understanding them and maintaining progress. Usability testing is open to any available learner group during the short hackathon. Recruitment from a particular institution is optional, not a dependency. Include varied digital confidence and connectivity conditions when feasible.

### Jobs to be done

- When I upload my course material, help me see its important concepts and where to begin.
- When I think I understand something, help me test that understanding before showing the answer.
- When I struggle, help me revisit the relevant explanation and practise again.
- When a topic requires doing, suggest a concrete exercise with a way to assess my work.
- When I need another explanation, help me find a credible, free resource.
- When I return after a break, help me take a manageable next step.

## 3. Capstone alignment

**Theme:** Learning That Stays With You.

| Track | Contribution | Position |
| --- | --- | --- |
| Engagement & Staying in the Learning Journey | Recall activities, spaced review, flexible sessions, and recovery after interruptions | Primary |
| Access & Discovery of Learning Resources | Organizes supplied material and recommends credible, freely accessible supplementary resources | Supporting |
| Guidance, Pathways & Opportunity | Guides next study steps and practical application | Supporting guidance; career and credential pathways are future scope |

## 4. Goals and non-goals

### Goals

1. Demonstrate a complete journey from uploaded material to a source-linked learning activity.
2. Help learners reveal understanding gaps through active recall and concept checks.
3. Offer an achievable session based on time available and recent learning evidence.
4. Make returning after a break straightforward and encouraging.
5. Keep data use low and preserve learner work when network requests fail.

### Non-goals for the hackathon

- Production-scale support for every subject, language, or document format.
- Accredited assessment, exam-score prediction, or certification.
- A precise scientific measurement of mastery or forgetting probability.
- Automatic completion of graded assignments.
- A comprehensive course marketplace, social network, or career platform.
- Executing learner code, automated project grading, or unrestricted web crawling.
- Full offline study, offline AI generation, cross-device synchronization, accounts, or advanced adaptive algorithms.
- Additional document formats, general scanned-PDF OCR, or a second language in P0. Math-heavy image transcription is only an optional gated experiment, not a prerequisite for equation support.
- Production server/provider retention-policy design, automated retention schedules, or compliance infrastructure.

## 5. Scope and priorities

P0 means required for the end-to-end demo. P1 means a stretch feature after P0 works. P2 means future work. Limits below are proposed implementation defaults, not decisions already validated with learners.

| Priority | Capability | Prototype boundary |
| --- | --- | --- |
| P0 | Material ingestion | Text-based PDF and TXT only; one material per study space |
| P0 | Concept organization | Editable concept list and source-linked concept map with list alternative |
| P0 | Active learning | Recall, multiple-choice, explain-in-your-own-words, scenario-based, and calculation/equation questions where source evidence supports them |
| P0 | Feedback | Answer rationale, source excerpt, rubric-based reasoning feedback, targeted follow-up, and learner-requested hints or alternate explanations |
| P0 | Study sessions | Learner-selected 5, 15, or 30 minute session; custom time optional |
| P0 | Progress and review | Record attempts and schedule review through transparent rules |
| P0 | Return flow | Rebuild a short session after a gap without accumulating compulsory overdue work |
| P0 | Practical learning | One source-grounded application task per suitable concept; learner self-check |
| P0 | Supplementary resources | Relevant free resources, including YouTube and websites discovered through Google; use checked links or a small curated collection |
| P1 | Limited connectivity | Full offline study is deferred; local persistence and network-failure recovery remain P0 |
| P0 | Privacy and accessibility | Clear processing disclosure, deletion, keyboard use, untimed questions |
| P1 | Learning puzzles | Matching and ordering where pedagogically appropriate |
| P2 | Expanded discovery | Live resource search with URL, access, and relevance verification |
| P2 | Opportunity pathways | Projects linked to local credentials, institutions, or opportunities |

## 6. Core learner journey

1. **Create a study space:** give it a title, optionally describe the learning goal, and select a PDF or TXT file for browser-local import.
2. **Check the material:** show extracted text, section/page references, processing status, and warnings. Let the learner correct the title or retry before generation.
3. **Explore concepts:** present important concepts and suggested relationships. The learner selects, renames, or excludes concepts. Inferred prerequisites are marked as suggestions.
4. **Choose a session:** ask how much time is available and whether the learner wants to learn, review, or practise. Recommend a session with a brief reason.
5. **Learn actively:** offer a concise explanation or excerpt, then a question before revealing its answer. Allow hints, alternate explanations, skipping, and returning to the source. Include scenarios and calculation/equation questions when the selected material supports them.
6. **Reflect and save:** show what was checked, what needs another check, and the suggested next review. Confidence is optional and separate from correctness.
7. **Return:** resume unfinished work or offer a short recovery session using prior attempts and available time.

## 7. Functional requirements and acceptance criteria

### FR-01 — Ingest learner material

**Requirement:** Accept PDF and TXT files only; validate and extract them in the browser with stable source references. Original files are not uploaded to the application server.

**Acceptance criteria:**

- Display supported formats and proposed limits before upload: 10 MB and 50 pages per PDF for the prototype.
- Enforce configurable file size, format, and PDF page limits in the browser. The stateless AI endpoint separately enforces request byte/text limits, schemas, and output budgets for selected excerpts and answers; it does not accept source-file uploads.
- Every extracted chunk retains document ID, section or page location, and text offsets where available.
- Empty, unreadable, encrypted, oversized, or unsupported files produce actionable errors.
- Scanned PDFs without extractable text are identified and ask for a text-based PDF or TXT file.
- Equation activities require reliably extracted or reviewed, explicitly transcribed evidence. Flag missing symbols or ambiguous notation and ask for correction or a usable text source; do not guess. Optional math-heavy image transcription requires a separate go/no-go check for model capability, quality, data/cost budget, and explicit consent to send selected image crops. It must disclose this exception to text-only requests; full-document upload and general scanned-PDF OCR remain outside P0.
- A failed import does not erase a previously usable study space. Store originals and extracted chunks in IndexedDB; report storage failures without claiming the import succeeded.

### FR-02 — Organize concepts

**Requirement:** Generate a small navigable concept structure from the supplied material.

**Acceptance criteria:**

- Limit initial extraction to approximately 5–15 concepts per selected section; allow a narrower selection for long documents.
- Each concept has a title, plain-language description, and one or more supporting source references.
- The learner can select concepts and edit labels; edits remain associated with the original concept ID.
- Suggested relationships and prerequisites are visibly distinguished from explicitly stated relationships.
- The map has an equivalent readable list; no concept is permanently blocked by a prerequisite suggestion.

### FR-03 — Generate learning activities

**Requirement:** Produce activities grounded in selected source content.

**Acceptance criteria:**

- Generate small packs of 3–5 questions covering at least two selected concepts when sufficient material exists.
- Each pack is a self-contained, versioned JSON object with questions, answers or rubrics, explanations, and cited source excerpts with stable IDs. Pack content requires no server lookups; this does not guarantee offline app loading.
- Each question includes type, concept ID, prompt, answer or rubric, explanation, source references, and estimated duration.
- Answers remain hidden until submission or deliberate reveal; revealed or skipped answers do not count as independent recall success.
- Multiple-choice items have one supported answer and plausible, unambiguous alternatives.
- Short-answer and scenario feedback use a source-grounded rubric and allow an uncertain result rather than forced binary grading. Scenarios ask learners to apply a concept to a concrete situation, with clear assumptions and an assessable response.
- Calculation/equation questions include supported givens, notation, worked explanation, an expected numeric answer where applicable, explicit tolerances and unit policy, and a reasoning rubric. Validate the key and independently check demo calculations; a model-generated key or valid schema is not proof of mathematical correctness.
- Check numeric final answers deterministically against a validated key using specified absolute/relative tolerances and supported unit conversions. Reject ambiguous/unsupported units or malformed values with actionable feedback. General symbolic equivalence is not required in P0.
- Grade learner working with the model against the rubric, preserving uncertainty and separating reasoning feedback from the numeric result. A correct number alone does not prove correct reasoning; unsupported or conflicting outcomes must not advance reasoning-based progress.
- Learners can flag an incorrect or ambiguous item; flagged items are excluded from future scoring until regenerated or reviewed.
- If source evidence is insufficient, TAI explains the limitation instead of inventing an answer.

### FR-04 — Provide source-linked feedback

**Requirement:** Explain feedback and let learners inspect the supporting material.

**Acceptance criteria:**

- Feedback identifies supported elements, missing elements, and the relevant source location.
- A wrong answer can trigger a prerequisite check but never proves a prerequisite weakness on its own.
- Distinguish “supported by your material” from “supplementary explanation”; neither label implies that uploaded material is factually verified.
- Contradictions or extraction uncertainty are flagged for learner review.
- AI feedback can be challenged without penalizing the learner.
- Hints and alternate explanations are explicit, source-grounded tutor tasks requested by the learner. Record their use separately and keep hidden answers concealed until deliberate reveal. Select targeted follow-up from the assessed gap; do not diagnose a misconception from one answer alone.

### FR-05 — Prepare a manageable session

**Requirement:** Select learning and review activities based on available time, learner choice, and recent evidence.

**Acceptance criteria:**

- Recommended activity estimates fit within the selected budget; actual time is not enforced.
- If review is due, offer a review item plus targeted practice when time permits.
- Explain selection in plain language, such as “You asked for another check on this concept.”
- Learners can change the time budget, skip an activity, or choose a different concept.
- Persist progress in IndexedDB after each submitted activity before showing completion. Save answer drafts locally before AI grading; a failed request retains the answer for an explicit manual retry, without automatically queuing or replaying grading.

### FR-06 — Track evidence and schedule review

**Requirement:** Maintain concept-level learning evidence with a simple review policy.

**Acceptance criteria:**

- Use labels such as “Not checked,” “Needs practice,” “Recall successful,” and “Review due.” Avoid unsupported mastery percentages.
- Store numeric correctness, rubric/working outcome and uncertainty where applicable, hints/reveals, attempt time, and optional learner confidence separately.
- Proposed review intervals are 1, 3, 7, and 14 days after successive independent successful checks; unsuccessful checks restart at a short interval.
- Hinted or revealed answers prompt another independent check rather than automatically extending the interval.
- Learners can review earlier or override a recommendation.
- The interface explains that review timing is a heuristic, not a validated forgetting prediction.

### FR-07 — Support returning after a break

**Requirement:** Offer recovery after inactivity without punishment or a compulsory backlog.

**Acceptance criteria:**

- After a proposed three-day gap, offer “Resume” and “Start a short review”; the threshold is configurable.
- Select a small number of useful checks that fit today’s time budget.
- Old due dates do not multiply required activities or create a session longer than the current budget.
- A missed day does not erase progress; use neutral, encouraging copy and no broken-streak penalty.

### FR-08 — Support learning by doing

**Requirement:** Suggest suitable practical tasks grounded in the topic.

**Acceptance criteria:**

- Each task contains an objective, instructions, expected output, required tools, estimated time, and self-check criteria.
- Make tool, connectivity, and cost requirements visible before starting; offer a no-cost alternative where feasible.
- Provide a simpler task when the learner requests it.
- Completion is learner-reported in the MVP; label it separately from quiz performance.
- Do not generate physical activities that require hazardous procedures or specialist supervision.

### FR-09 — Recommend supplementary resources

**Requirement:** Recommend relevant, freely accessible learning resources across subjects, including YouTube videos and educational websites. Google may be used to discover resources; the linked website or video is the actual learning source. No fixed subject or publisher list is required.

**Acceptance criteria:**

- Each recommendation includes title, publisher or channel, URL, supported concept, language, format, access conditions, and last checked date.
- A small collection of checked links is an acceptable MVP implementation; automated Google or YouTube integrations are not required. Never invent resource URLs.
- Explain why the resource helps; distinguish supplementary resources from the uploaded material.
- Recommend resources whose suggested learning content is available free of charge; exclude paid-only content and disclose required accounts or optional paid offerings.
- Prefer text or lightweight resources; disclose video format and avoid autoplay.
- External resources open only when the learner chooses them; recommend no resource if no suitable verified match exists.
- The prototype does not imply that discovery covers every uploaded topic.

### FR-10 — Full offline study (P1, deferred)

Full offline study is outside the P0 demo. Omit service workers, cached app shells, save-for-offline actions/manifests, offline indicators, queued grading, deletion queues, and outbox replay. Local persistence and network-failure recovery remain P0 under FR-05, FR-11, and §12; they do not guarantee availability after a disconnected reload. Reassess offline delivery after the core learning loop is validated.

### FR-11 — Protect learner data

**Requirement:** Minimize collection and make processing and deletion understandable.

**Acceptance criteria:**

- Allow a single-device guest flow without requiring a name, school, or account.
- Before online processing, disclose that bounded selected excerpts and answers needed for rubric grading pass through the application server to the configured AI service. Original PDF/TXT files remain in the browser. Any optional image-transcription experiment requires separate disclosure and consent for bounded selected crops under FR-01; it is not part of the P0 text-only path.
- Retain originals, chunks, packs, drafts, attempts, and progress in IndexedDB as the canonical store. Do not automatically delete originals after extraction.
- Learners can delete a study space and all its local originals, extracted text, activities, drafts, and attempts, or clear all data. Cancel associated in-flight work and discard late responses so deletion cannot recreate records; no server deletion queue is needed.
- Deletion removes application-controlled data. Production server/provider retention-policy design is outside the hackathon scope; do not promise deletion from systems the application does not control.
- Do not log raw documents or answer text by default; keep analytics optional and minimal.
- Keep AI credentials server-side. Use no learner database or authentication service; isolate local records by study-space ID and validate references. A browser profile is the data boundary, not secure account isolation. Disclose shared-device access and loss of work when browser data is cleared without backup.

## 8. Interface requirements

| Screen | Main purpose | Essential controls |
| --- | --- | --- |
| Home | Choose a study space or resume | Import PDF/TXT, recent spaces |
| Material review | Confirm readable source | Extracted preview, status, retry, delete |
| Concept explorer | Choose what to study | Map/list toggle, source links, select/edit concepts |
| Today’s session | Make the next step manageable | Time budget, suggested activities, selection reason, change topic |
| Activity | Recall, explain, or practise | Prompt, working/final answer where relevant, submit, hint, alternate explanation, reveal, source, skip, flag |
| Session summary | Reflect and continue | Evidence summary, optional confidence, next review |
| Resources | Extend understanding | Relevant links, publisher, access and format information |
| Settings | Control accessibility and data | Text size, supported language information, delete space/all data |

Use plain language, large touch targets, visible focus states, readable contrast, screen-reader labels, and untimed activities. Do not rely only on color to show progress. Present one primary task at a time and allow learners to reduce reading complexity without changing the source’s meaning.

Render supported LaTeX safely with KaTeX (or an equivalent bounded renderer), disable trusted HTML/URL commands, bound input complexity, and show a readable fallback when rendering fails. Keep equations keyboard-accessible with accessible text/MathML; mathematical content must never execute scripts or application code.

## 9. Language and local relevance

The MVP interface and generation language is English only. Preserve uploaded terminology and explicitly disclose language support. Unsupported languages must produce a clear limitation rather than unreliable output presented as equivalent support.

A second language is outside this hackathon scope. Let learners request simpler English. Preserve local course conventions, units, and examples where identifiable; supplementary examples must be labelled and must not silently replace the learner’s curriculum.

## 10. AI behavior and system design

### AI responsibilities

- Extract concepts from retrieved source chunks.
- Draft source-grounded explanations, scenarios, calculation/equation questions, other questions, rubrics, and practical tasks.
- Provide requested hints and alternate explanations, and targeted follow-up grounded in assessed evidence.
- Give rubric-based feedback on free-text answers and mathematical working where sufficient evidence exists; expose uncertainty and do not substitute model judgment for deterministic numeric checking.
- Match concepts to relevant free resources from checked links or a curated collection.

### Deterministic application responsibilities

- Browser file validation, source identifiers, local study-space isolation, persistence, and deletion; server request validation and abuse controls.
- Session budgeting and review dates.
- Exact grading of validated multiple-choice items and numeric final-answer checks using validated keys, configured tolerances, and supported unit rules.
- Local draft and progress writes, explicit retries, and duplicate-attempt prevention.
- Validation of AI output schemas and cited source IDs.

### Bounded tutor stages

Use a fixed structured workflow: **read → write → grade → targeted follow-up**. Read selects and interprets bounded source evidence; write produces validated activities, keys, and rubrics; grade combines deterministic answer checks with rubric feedback when needed; follow-up addresses an identified gap. Each model task has a schema, validated source IDs, input/output limits, and a clear failure state. These are application-controlled stages, not autonomous agents or a requirement for four calls per answer. Reuse saved read/write outputs across a pack; MCQ and numeric final-answer checks stay local. Invoke model grading only for answers/working needing a rubric, and generate follow-up, hints, or alternate explanations only when needed or requested within the session/cost budget.

### Proposed processing flow

Import PDF/TXT in browser → validate, extract, and persist originals/chunks in IndexedDB → select bounded excerpts for concept generation → validate concepts → learner selects concepts → retrieve local chunks → send selected excerpts through stateless AI endpoint → validate structured pack and source references → save self-contained pack locally → study and check multiple-choice/numeric final answers locally → save answers before online rubric grading → record evidence locally → calculate next review.

Treat uploaded text as content, never as executable instructions. Reject invented citation IDs, sanitize extracted and generated content before rendering, and avoid automatic fetching of arbitrary URLs from uploaded text. Validate references against actual chunks; this checks traceability but does not establish factual accuracy. Offer explicit, bounded manual retries and a clear fallback if generation fails. Do not automatically replay failed generation or grading requests.

IndexedDB is the canonical learner store; the browser extracts PDF/TXT and retrieves source chunks. The server is a stateless AI proxy with no learner database, source-file storage, authentication, or synchronization. It validates bounded requests, holds credentials, and invokes the provider without persisting learner payloads. AWS Bedrock is the proposed provider, subject to funding, Region, and model-access checks in the roadmap. Keep the AI adapter replaceable; framework and hosting remain implementation choices.

## 11. Minimum data model

| Entity | Essential fields |
| --- | --- |
| StudySpace | ID, title, goal, preferred language, created date; scoped to this browser profile |
| Material | ID, study-space ID, filename, format, original file/blob, processing status, retention state |
| SourceChunk | ID, material ID, text, page/section, offsets |
| Concept | ID, study-space ID, title, description, source IDs, suggested prerequisites |
| Activity | ID, concept IDs, type, prompt, answer/rubric, numeric key/tolerances/unit policy where applicable, explanation, source IDs, duration, flag state |
| ActivityPack | ID, study-space ID, schema version, activities including answers/rubrics and explanations, cited source excerpts with IDs |
| AnswerDraft | ID, study-space ID, activity ID, answer text/working and final value/unit where applicable, updated date; retained for manual retry, not a job queue |
| Attempt | ID, activity ID, outcome, numeric result and rubric/working outcome/uncertainty where applicable, hint/reveal state, optional confidence, timestamp |
| ConceptProgress | Concept ID, evidence label, review step, next review date, last independent check |
| Session | ID, study-space ID, budget, activity IDs, completion state, last activity |
| Resource | ID, title, publisher, URL, concept tags, language, format, access conditions, checked date |

Persist learner entities in IndexedDB using stable IDs and a schema version. Updating or deleting material invalidates dependent generated activities unless they still have valid evidence. Do not infer sensitive characteristics from performance.

## 12. Reliability and performance targets

These are prototype acceptance targets, not measured results or production service commitments.

- Show immediate processing feedback and a recoverable state for long-running generation.
- Aim to prepare the first 3–5-question pack within 60 seconds on representative supported material. Measure browser extraction, time to first usable question, and full-pack generation separately. Stream incrementally where supported; expose only complete questions after schema and source-reference validation, never incomplete model output.
- After the current pack is usable, allow at most one bounded next-pack pre-generation request while the learner studies, subject to session needs and cost budget. Reuse successful results locally; cancel or discard obsolete work. Measure before claiming improved latency.
- Saved sessions should open within two seconds on the target test device.
- Minimize initial assets; avoid required video, large decorative images, or automatic full-document downloads. Send only bounded selected text (aim for a few KB when sufficient) and necessary grading context to AI, never the whole PDF. Measure actual request sizes instead of promising a fixed data-use guarantee.
- Prevent duplicate submissions from generating duplicate attempts or repeated AI calls.
- Persist activity progress before presenting completion; on failure, retain the learner’s answer and offer retry.
- Confirm the core flow in mobile viewport, keyboard-only interaction, network interruption, and reload with connectivity. A dropped request must preserve local progress and drafts for manual retry; disconnected reload and app-shell availability are outside P0.

## 13. Validation and success measures

### Demo completion criteria

- A learner uploads their own supported material and receives source-linked concepts and questions.
- The learner answers correctly and incorrectly; feedback and later selections respond appropriately.
- A source-grounded scenario receives rubric feedback and useful targeted follow-up. A supported calculation/equation renders readably, checks numeric tolerance and units locally, and distinguishes a correct final number from flawed or uncertain working. Demonstrate a requested hint and alternate explanation without falsely counting assisted success as independent recall.
- A suitable concept produces a practical exercise with self-check criteria.
- A supported concept shows a reviewed free supplementary resource.
- A simulated five-day gap produces a manageable ten-minute recovery session.
- A dropped AI request preserves the saved answer and completed progress; explicit retry can continue without duplicate attempts.
- Deletion removes the study space’s application-controlled data.

### Quality-first model evaluation

Compare a smaller and a stronger eligible Bedrock model on the same two permitted source documents and the same activity/answer cases before choosing the default. Include one quantitative document and one supporting scenario-based reasoning. Assess source fidelity, question usefulness, independent numeric-key correctness, working/rubric feedback (including uncertainty), hints and alternate explanations, then measure latency, request size, and cost. Use consistent prompts and budgets and record model IDs/Regions and actual results; choose quality sufficient for the learning loop before optimizing price. Model availability, credits, and access must be verified, not assumed; no OpenAI access or funding is implied. If only one model is accessible, record the comparison as blocked rather than claiming it passed.

### Small learner pilot

Recruit any available learners using their own non-sensitive PDF or TXT materials; no specific institution or learner group is required. Aim for five participants if time permits. A smaller pilot is acceptable: report its actual size and descriptive results rather than presenting the targets below as achieved. Proposed signals for a five-person pilot:

| Measure | Initial target |
| --- | --- |
| Complete upload-to-first-activity without facilitator intervention | At least 4 of 5 learners |
| Describe why TAI selected the next activity | At least 4 of 5 learners |
| Find the source behind a question | At least 4 of 5 learners |
| Rate restart flow as manageable | At least 4 of 5 learners |
| Generated-content audit | Review at least 20 items across two subject areas, including scenarios and calculations/equations; audit source references, independently checked keys, tolerances/units, reasoning rubrics, hints, and follow-up, with zero known critical errors in demo items |

If time permits, repeat a small concept check several days later and report the observed results without claiming causal improvement in retention. Completion and satisfaction alone do not prove learning effectiveness.

## 14. Implementation milestones

1. **Source pipeline:** browser PDF/TXT import and extraction, IndexedDB originals/chunks, source references, material preview, and local deletion.
2. **Learning loop:** concept selection, bounded read/write/grade/follow-up workflow, P0 scenarios and calculation/equation questions, safe math rendering, deterministic numeric checks, rubric feedback, hints/alternate explanations, and source inspection.
3. **Continuity:** session budgeting, attempt persistence, review rules, and recovery flow.
4. **Application and access:** practical task templates, curated resource matching, low-data requests, and accessibility pass.
5. **Demo verification:** content audit, failure cases, network-failure recovery, local storage and mobile checks, and learner walkthroughs.

Exit each milestone with a working flow. If time is short, simplify map complexity and resource-discovery implementation before removing source traceability or the core recall-and-return loop.

## 15. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| AI produces incorrect questions or feedback | Ground in selected chunks, validate references, audit demo items, allow flagging, and expose uncertainty |
| Uploaded material contains errors | Describe source support honestly; do not claim factual verification; surface contradictions |
| Extraction loses equations, tables, or diagrams | Preview and validate source notation, require reliable extraction or reviewed transcription, and avoid unsupported activities; optional image transcription stays gated outside P0 |
| Correct-looking numeric result hides faulty reasoning or key | Independently check demo keys, validate tolerances/units, separate deterministic final-answer checks from uncertain rubric grading of working, and avoid unsupported progress claims |
| Cross-subject promise exceeds prototype capability | Publish format/topic limitations and test more than one subject without claiming universal coverage |
| Review recommendations feel rigid | Allow overrides, skipping, and earlier review; avoid permanent locks |
| Free resources are unavailable or irrelevant | Maintain a dated curated collection and return no match when appropriate |
| Browser data is cleared or storage is full | Explain local persistence, report save failures, and avoid implying permanent backups |
| AI latency or cost interrupts study | Generate 3–5-question reusable packs, validate streamed items, bound manual retries and pre-generation, retain results locally, and measure latency/cost |
| Connection fails during grading | Save drafts first, preserve completed work, offer manual retry, and prevent duplicate attempts; no background replay |
| Shared browser exposes learner data | Explain browser-profile boundary and local deletion; do not imply account isolation or cloud backup |
| Learners cannot use text-heavy experiences | Plain language, adjustable text, small activity steps, accessible controls, and future language review |

## 16. Confirmed hackathon decisions

| Decision | Agreed scope |
| --- | --- |
| Uploaded formats | PDF and TXT only; general scanned-PDF OCR outside P0; optional math-image transcription requires explicit consent, bounded crops/data, and a separate quality/capability gate |
| Active learning | Scenarios and calculation/equation questions join P0 where evidence supports them; matching/ordering puzzles remain P1 |
| Tutor workflow | Fixed bounded read/write/grade/follow-up stages; explicit hints and alternate explanations, no autonomous loop or four-call-per-answer requirement |
| Mathematical feedback | Safe LaTeX rendering, deterministic numeric tolerance/unit checks, separate uncertain rubric grading of working, and independently checked demo keys |
| Model selection | Evaluate smaller versus stronger eligible Bedrock models on the same two documents; prioritize learning quality and report actual access, costs, and results |
| Usability participants | Any available learner group; institution-specific recruitment is optional |
| Language | English only; no second language during this hackathon |
| Subject coverage | Learner-provided subjects; no predefined subject curriculum |
| Supplementary resources | Relevant free, available content such as YouTube videos and educational websites found through Google |
| Source-file handling | Parse and retain originals in the browser; send selected text for AI and support local deletion |
| Canonical storage | IndexedDB holds originals, chunks, packs, drafts, attempts, and progress; no learner database, authentication, or sync |
| Offline scope | Defer FR-10/full offline study to P1; omit service workers, app-shell caching, save-for-offline actions/manifests, offline indicators, queued grading, deletion queues, and outbox replay |
| Connectivity resilience | Keep low-data requests, local progress/drafts, and explicit manual retries in P0; persistence does not guarantee offline app loading |
| Pack portability | Self-contained JSON carries questions, answers, explanations, and source excerpts; future offline delivery still needs caching, storage, and recovery validation |
| Production retention policy | Outside the short hackathon scope; retain basic application deletion and processing disclosure |

## 17. Remaining implementation choices

Choose framework, hosting, exact Bedrock model/Region (or documented provider fallback), and simplest viable resource-link mechanism during implementation. IndexedDB canonical storage and a stateless AI endpoint are agreed architecture boundaries. Use the proposed file limits and review intervals as configurable defaults. These choices should serve the end-to-end MVP without expanding the scope.

The core scope remains: learners bring their own materials, and TAI supports understanding, practice, retention, and continued learning.
