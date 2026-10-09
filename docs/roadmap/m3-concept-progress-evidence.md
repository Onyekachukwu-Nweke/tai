# M3 concept progress evidence

Status: bounded M3.3 slice implemented; M3 remains in progress.

TAI now projects owner-scoped review evidence for every concept in the current material and concept revision. Only an unflagged, server-checked multiple-choice submission contributes scored evidence. Recall self-checks, ungraded explanations, reveals, skips, confidence and hint metadata remain separate and neutral. Each pack also stores normalized question-to-concept associations, so evidence remains attached to stable concepts across ordinary new packs and selection changes.

Successive eligible checks use fixed UTC intervals of 1, 3, 7 and 14 days, capped at 14. An incorrect check resets the step and suggests another check after one day. The learner sees **Not checked**, **Needs practice**, **Recall successful**, or **Review due** rather than a percentage. The interface states that timing is a study heuristic rather than a validated memory prediction; it does not impose a timer, lock or forced backlog.

Attempt insertion and projection updates run in one D1 batch. Identical attempt retries remain idempotent, concurrent distinct attempts are serialized by D1, and flagging a question atomically excludes all of that question's earlier evidence and rebuilds each affected concept projection. Current-revision filtering prevents evidence from a replaced material or regenerated concept revision from appearing.

Automated coverage includes UTC due boundaries, all interval steps and the cap, incorrect reset, neutral interactions, concurrent submissions, multi-concept projection, retroactive flag exclusion, authenticated ownership, reload and deletion behavior. Verification results for the final revision belong in the pull request description; no remote D1 or live provider was exercised for this slice.

Still open: recovery sessions after inactivity, model-graded evidence, numeric evidence, live-provider validation and the complete M3 exit demonstration. The bounded session-budget and choice work is recorded separately in [M3.1 study-session evidence](m3-study-session-evidence.md).
