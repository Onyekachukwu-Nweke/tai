# TAI — Product Requirements Document

**Version:** 0.1 · **Date:** 5 October 2026 · **Status:** Draft for hackathon implementation

## 1. Product summary

TAI is a self-directed learning companion that turns a learner’s own course materials into manageable, active learning experiences. Learners bring notes or course documents; TAI helps them identify concepts, check understanding, practise applying ideas, revisit material, and resume after interruptions.

**Product promise:** Bring your material. Understand it, practise it, and keep learning.

TAI is not restricted to introductory statistics or a predefined curriculum. The prototype supports a bounded set of document formats across subjects, with explicit limits when material cannot be reliably interpreted.

## 2. Problem and intended users

Self-directed learners often have materials but lack a clear way to use them effectively. Reading can feel productive without revealing understanding gaps. Learners may not know what to practise, when to review, or how to restart after missed sessions. Limited mobile data, unreliable connectivity, and unfamiliar terminology can compound these difficulties.

Primary users are students and independent learners across Africa who already have course materials and need help understanding them and maintaining progress. The first usability tests should include learners with limited connectivity and varied digital confidence. This audience is a starting hypothesis, not an eligibility restriction.

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
5. Keep previously prepared study activities usable with limited connectivity.

### Non-goals for the hackathon

- Production-scale support for every subject, language, or document format.
- Accredited assessment, exam-score prediction, or certification.
- A precise scientific measurement of mastery or forgetting probability.
- Automatic completion of graded assignments.
- A comprehensive course marketplace, social network, or career platform.
- Executing learner code, automated project grading, or unrestricted web crawling.
- Full offline AI generation, cross-device synchronization, or advanced adaptive algorithms.

## 5. Scope and priorities

P0 means required for the end-to-end demo. P1 means a stretch feature after P0 works. P2 means future work. Limits below are proposed implementation defaults, not decisions already validated with learners.

| Priority | Capability | Prototype boundary |
| --- | --- | --- |
| P0 | Material ingestion | Text-based PDF, TXT, or pasted text; one material per study space |
| P0 | Concept organization | Editable concept list and source-linked concept map with list alternative |
| P0 | Active learning | Recall questions, multiple-choice concept quizzes, and short explain-in-your-own-words prompts |
| P0 | Feedback | Answer rationale, relevant source excerpt, and targeted follow-up |
| P0 | Study sessions | Learner-selected 5, 15, or 30 minute session; custom time optional |
| P0 | Progress and review | Record attempts and schedule review through transparent rules |
| P0 | Return flow | Rebuild a short session after a gap without accumulating compulsory overdue work |
| P0 | Practical learning | One source-grounded application task per suitable concept; learner self-check |
| P0 | Supplementary resources | Small curated resource collection matched to supported concepts |
| P0 | Limited connectivity | Save selected prepared activities and progress locally |
| P0 | Privacy and accessibility | Clear processing disclosure, deletion, keyboard use, untimed questions |
| P1 | Learning puzzles | Matching, ordering, and scenario activities where pedagogically appropriate |
| P1 | Additional formats | DOCX, PPTX, or OCR for scanned material |
| P1 | Additional language | One explicitly selected and reviewed language beyond English |
| P2 | Expanded discovery | Live resource search with URL, access, and relevance verification |
| P2 | Opportunity pathways | Projects linked to local credentials, institutions, or opportunities |

## 6. Core learner journey

1. **Create a study space:** give it a title, optionally describe the learning goal, and upload or paste material.
2. **Check the material:** show extracted text, section/page references, processing status, and warnings. Let the learner correct the title or retry before generation.
3. **Explore concepts:** present important concepts and suggested relationships. The learner selects, renames, or excludes concepts. Inferred prerequisites are marked as suggestions.
4. **Choose a session:** ask how much time is available and whether the learner wants to learn, review, or practise. Recommend a session with a brief reason.
5. **Learn actively:** offer a concise explanation or excerpt, then a question before revealing its answer. Allow hints, skipping, and returning to the source.
6. **Reflect and save:** show what was checked, what needs another check, and the suggested next review. Confidence is optional and separate from correctness.
7. **Return:** resume unfinished work or offer a short recovery session using prior attempts and available time.

## 7. Functional requirements and acceptance criteria

### FR-01 — Ingest learner material

**Requirement:** Accept supported files or pasted text; extract content with stable source references.

**Acceptance criteria:**

- Display supported formats and proposed limits before upload: 10 MB and 50 pages per PDF for the prototype.
- Enforce limits on both client and server; treat these thresholds as configurable.
- Every extracted chunk retains document ID, section or page location, and text offsets where available.
- Empty, unreadable, encrypted, oversized, or unsupported files produce actionable errors.
- Scanned PDFs without extractable text are identified and ask for pasted text or a text-based file.
- A failed upload does not erase a previously usable study space.

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

- A generated pack includes at least three questions covering at least two selected concepts when sufficient material exists.
- Each question includes type, concept ID, prompt, answer or rubric, explanation, source references, and estimated duration.
- Answers remain hidden until submission or deliberate reveal; revealed or skipped answers do not count as independent recall success.
- Multiple-choice items have one supported answer and plausible, unambiguous alternatives.
- Short-answer feedback uses a rubric and allows an uncertain result rather than forced binary grading.
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

### FR-05 — Prepare a manageable session

**Requirement:** Select learning and review activities based on available time, learner choice, and recent evidence.

**Acceptance criteria:**

- Recommended activity estimates fit within the selected budget; actual time is not enforced.
- If review is due, offer a review item plus targeted practice when time permits.
- Explain selection in plain language, such as “You asked for another check on this concept.”
- Learners can change the time budget, skip an activity, or choose a different concept.
- Save progress after each submitted activity so interruption does not lose completed work.

### FR-06 — Track evidence and schedule review

**Requirement:** Maintain concept-level learning evidence with a simple review policy.

**Acceptance criteria:**

- Use labels such as “Not checked,” “Needs practice,” “Recall successful,” and “Review due.” Avoid unsupported mastery percentages.
- Store correctness or rubric outcome, hints/reveals, attempt time, and optional learner confidence separately.
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

**Requirement:** Match concepts to a small reviewed collection of free learning resources.

**Acceptance criteria:**

- Each recommendation includes title, publisher, URL, supported concept, language, format, access conditions, and last checked date.
- Explain why the resource helps; distinguish supplementary resources from the uploaded material.
- Recommend free-to-access content and disclose required accounts or optional paid offerings.
- Prefer text or lightweight resources; disclose video format and avoid autoplay.
- External resources open only when the learner chooses them; recommend no resource if no suitable verified match exists.
- The prototype does not imply that discovery covers every uploaded topic.

### FR-10 — Work with limited connectivity

**Requirement:** Separate online preparation from offline study.

**Acceptance criteria:**

- Upload, AI generation, and resource retrieval require connectivity and display that requirement.
- A learner can explicitly save an already generated activity pack for offline use.
- Saved explanations, concept lists, multiple-choice/recall activities, answer rationales, and local progress remain available after reload without connectivity.
- New AI explanations and rubric-based grading of free text are unavailable offline; retain the answer for later or offer a clearly labelled self-check.
- Display offline status and storage failures. Warn that clearing browser data removes locally stored content.
- Do not claim that linked websites or original PDFs are available offline unless explicitly cached.

### FR-11 — Protect learner data

**Requirement:** Minimize collection and make processing and deletion understandable.

**Acceptance criteria:**

- Allow a single-device guest flow without requiring a name, school, or account.
- Before online processing, disclose that selected material and answers may be sent to the configured AI service.
- Learners can delete a study space and its documents, extracted text, generated activities, and attempts, or clear all data.
- Deletion covers application-controlled local and server records; disclose any provider retention limitations instead of promising deletion outside application control.
- Do not log raw documents or answer text by default; keep analytics optional and minimal.
- Keep credentials server-side and prevent access to another learner’s study space.

## 8. Interface requirements

| Screen | Main purpose | Essential controls |
| --- | --- | --- |
| Home | Choose a study space or resume | Upload/paste, recent spaces, offline indicator |
| Material review | Confirm readable source | Extracted preview, status, retry, delete |
| Concept explorer | Choose what to study | Map/list toggle, source links, select/edit concepts |
| Today’s session | Make the next step manageable | Time budget, suggested activities, selection reason, change topic |
| Activity | Recall, explain, or practise | Prompt, submit, hint, reveal, source, skip, flag |
| Session summary | Reflect and continue | Evidence summary, optional confidence, next review, save offline |
| Resources | Extend understanding | Relevant links, publisher, access and format information |
| Settings | Control accessibility and data | Text size, supported language information, delete space/all data |

Use plain language, large touch targets, visible focus states, readable contrast, screen-reader labels, and untimed activities. Do not rely only on color to show progress. Present one primary task at a time and allow learners to reduce reading complexity without changing the source’s meaning.

## 9. Language and local relevance

The proposed MVP interface and generation language is English. Preserve uploaded terminology and explicitly disclose language support. Unsupported languages must produce a clear limitation rather than unreliable output presented as equivalent support.

An additional language is a stretch goal only after review of explanations and assessment quality by a competent speaker. Let learners request simpler English. Preserve local course conventions, units, and examples where identifiable; supplementary examples must be labelled and must not silently replace the learner’s curriculum.

## 10. AI behavior and system design

### AI responsibilities

- Extract concepts from retrieved source chunks.
- Draft source-grounded explanations, questions, rubrics, and practical tasks.
- Give rubric-based feedback where sufficient evidence exists.
- Match concepts to curated resources.

### Deterministic application responsibilities

- File validation, source identifiers, persistence, deletion, and access control.
- Session budgeting and review dates.
- Exact grading of validated multiple-choice items.
- Offline availability and progress updates.
- Validation of AI output schemas and cited source IDs.

### Proposed processing flow

Upload → extract and index source chunks → learner selects concepts → retrieve relevant chunks → generate structured activity pack → validate structure and references → save pack → study → record evidence → calculate next review.

Treat uploaded text as content, never as executable instructions. Reject invented citation IDs, sanitize extracted and generated content before rendering, and avoid automatic fetching of arbitrary URLs from uploaded text. Validate references against actual chunks; this checks traceability but does not establish factual accuracy. Use bounded retries and a clear fallback if generation fails.

Framework, AI provider, storage service, and hosting platform remain implementation choices. A small web application with a server-side AI endpoint and browser persistence is sufficient. Prefer a replaceable AI adapter and avoid infrastructure unnecessary for the demo.

## 11. Minimum data model

| Entity | Essential fields |
| --- | --- |
| StudySpace | ID, guest/session owner ID, title, goal, preferred language, created date |
| Material | ID, study-space ID, filename, format, processing status, retention state |
| SourceChunk | ID, material ID, text, page/section, offsets |
| Concept | ID, study-space ID, title, description, source IDs, suggested prerequisites |
| Activity | ID, concept IDs, type, prompt, answer/rubric, explanation, source IDs, duration, flag state |
| Attempt | ID, activity ID, outcome, hint/reveal state, optional confidence, timestamp |
| ConceptProgress | Concept ID, evidence label, review step, next review date, last independent check |
| Session | ID, study-space ID, budget, activity IDs, completion state, last activity |
| Resource | ID, title, publisher, URL, concept tags, language, format, access conditions, checked date |

Use stable IDs and a schema version. Updating or deleting material invalidates dependent generated activities unless they still have valid evidence. Do not infer sensitive characteristics from performance.

## 12. Reliability and performance targets

These are prototype acceptance targets, not measured results or production service commitments.

- Show immediate processing feedback and a recoverable state for long-running generation.
- Aim to prepare the first small activity pack within 60 seconds on representative supported material; measure extraction and generation separately.
- Saved sessions should open within two seconds on the target test device.
- Minimize initial assets; avoid required video, large decorative images, or automatic full-document downloads.
- Prevent duplicate submissions from generating duplicate attempts or repeated AI calls.
- Persist activity progress before presenting completion; on failure, retain the learner’s answer and offer retry.
- Confirm the core flow in mobile viewport, keyboard-only interaction, network interruption, reload, and offline mode.

## 13. Validation and success measures

### Demo completion criteria

- A learner uploads their own supported material and receives source-linked concepts and questions.
- The learner answers correctly and incorrectly; feedback and later selections respond appropriately.
- A suitable concept produces a practical exercise with self-check criteria.
- A supported concept shows a reviewed free supplementary resource.
- A simulated five-day gap produces a manageable ten-minute recovery session.
- A saved pack remains usable offline after reload and preserves submitted progress.
- Deletion removes the study space’s application-controlled data.

### Small learner pilot

Test with approximately five learners using their own non-sensitive materials. Proposed signals:

| Measure | Initial target |
| --- | --- |
| Complete upload-to-first-activity without facilitator intervention | At least 4 of 5 learners |
| Describe why TAI selected the next activity | At least 4 of 5 learners |
| Find the source behind a question | At least 4 of 5 learners |
| Rate restart flow as manageable | At least 4 of 5 learners |
| Generated-content audit | Review at least 20 items across two subject areas; every item has a valid source reference, with zero known critical errors in demo items |

If time permits, repeat a small concept check several days later and report the observed results without claiming causal improvement in retention. Completion and satisfaction alone do not prove learning effectiveness.

## 14. Implementation milestones

1. **Source pipeline:** upload/paste, extraction, source references, material preview, and deletion.
2. **Learning loop:** concept selection, question generation, feedback, and source inspection.
3. **Continuity:** session budgeting, attempt persistence, review rules, and recovery flow.
4. **Application and access:** practical task templates, curated resource matching, offline packs, and accessibility pass.
5. **Demo verification:** content audit, failure cases, mobile/offline checks, and learner walkthroughs.

Exit each milestone with a working flow. If time is short, reduce supported formats and map complexity before removing source traceability or the core recall-and-return loop.

## 15. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| AI produces incorrect questions or feedback | Ground in selected chunks, validate references, audit demo items, allow flagging, and expose uncertainty |
| Uploaded material contains errors | Describe source support honestly; do not claim factual verification; surface contradictions |
| Extraction loses equations, tables, or diagrams | Preview extracted content, identify limitations, and avoid generating unsupported activities |
| Cross-subject promise exceeds prototype capability | Publish format/topic limitations and test more than one subject without claiming universal coverage |
| Review recommendations feel rigid | Allow overrides, skipping, and earlier review; avoid permanent locks |
| Free resources are unavailable or irrelevant | Maintain a dated curated collection and return no match when appropriate |
| Browser data is cleared or storage is full | Explain local persistence, report save failures, and avoid implying permanent backups |
| AI latency or cost interrupts study | Generate small reusable packs, cache results, bound retries, and retain prepared activities |
| Learners cannot use text-heavy experiences | Plain language, adjustable text, small activity steps, accessible controls, and future language review |

## 16. Open decisions

- Which file formats beyond text-based PDF and TXT are feasible during the hackathon?
- Which learner group can participate in the first usability test?
- Which second language, if any, can be reviewed reliably?
- Which subject areas and publishers should seed the curated resource collection?
- Should source files be deleted immediately after extraction or retained by explicit learner choice?
- What server/provider retention policy can the selected implementation actually guarantee?

These decisions do not change the core scope: learners bring their own materials, and TAI supports understanding, practice, retention, and continued learning.
