# Code review

Review tai for correct learning behavior, source traceability, data protection, recoverability, and maintainability.

## Review priorities

1. Does the change meet the stated PRD acceptance criteria without expanding hackathon scope?
2. Are generated claims traceable to valid source chunks, with uncertainty shown honestly?
3. Are learner data and credentials protected at access and rendering boundaries?
4. Do saves, retries, interruptions, and reloads preserve progress without duplication?
5. Are network-failure recovery, accessibility, and learner controls appropriate?
6. Does verification support the claimed behavior and relevant failure cases?
7. Is the implementation cohesive and easy to maintain?

Block changes that introduce or modify authored software code files exceeding 350 physical lines. Apply the definitions and generated-code exemption in [code-hygiene.md](code-hygiene.md#file-size-and-responsibility). Smaller files must still have clear responsibilities.

## Learning and AI checks

- Generated activities have valid source references and validated output schemas.
- Uploaded content cannot override application instructions.
- Answers stay hidden until submission or deliberate reveal.
- Hints, reveals, skips, confidence, and correctness remain distinct.
- Flagged items do not contribute to scoring until reviewed or regenerated.
- The read → write → grade → targeted-follow-up pipeline includes P0 scenario and calculation questions.
- Numeric grading uses reviewed keys with explicit tolerance and unit rules; model feedback assesses working steps and allows uncertainty.
- LaTeX uses safe KaTeX rendering; generated expressions never reach raw `eval`.
- Uncertain rubric outcomes are allowed; source support is not presented as factual verification.
- Review timing is deterministic and described as a heuristic.
- Session estimates fit the selected budget; returning learners face no compulsory backlog.
- Resource links are checked, relevant, and free to access, with access conditions disclosed.

## Data and boundary checks

Verify local study-space isolation, input validation, sanitized rendering, server-side secrets, and safe errors. IndexedDB is canonical: original files are parsed and retained in the browser, and the stateless Bedrock gateway receives bounded selected text rather than files. Do not introduce a learner database or account/authentication flow. Raw documents and answers must not enter logs by default. Retained source files and dependent application data must be removed through local learner deletion. Cancel related in-flight work where possible and reject late responses after deletion. Disclose data loss if browser storage is cleared.

Check stable IDs, persisted schema versions, activity invalidation after source changes, and compatibility with saved packs. Review failure handling and duplicate-submission behavior. A dropped request must preserve the local answer and offer an explicit bounded retry, without automatic reconnect requests or duplicate attempt commits. Check quota errors and failed transactions. Full offline mode is deferred; offline caching, save controls, status UI, and grading/deletion queues are outside P0.

Keep packs self-contained with 3–5 questions, answers or rubrics, explanations, and source excerpts. Stream complete validated items only, grade MCQs locally, and bound prefetch to one next pack while the learner studies.

Compare smaller and stronger Bedrock candidates on the same two source documents and tasks. Review measured teaching quality, grounding, calculation correctness, latency, and cost; model capabilities and access must be verified rather than assumed.

## Verification and usability

Use [testing.md](testing.md) to select checks for the affected behavior. Inspect meaningful failure cases as well as the happy path. For UI changes, check keyboard navigation, focus, readable labels, mobile layout, and status/error messages. A concept map must retain its readable list alternative.

## Review communication

Label blocking findings clearly and explain the violated requirement or likely failure. Separate suggestions from required fixes. Prefer a concrete example or failing case over unexplained preferences.

Authors should address material comments and identify changes made after review. Reviewers should recheck affected assumptions after substantive revisions. Approve only when the code and evidence support the stated outcome; do not imply that unrun checks passed.
