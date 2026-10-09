# M3.4 recovery-session evidence

Status: bounded M3.4 return-flow slice implemented; M3 remains in progress.

TAI derives the learner's last interaction from the newest owner-scoped attempt or study-session creation on the current material and concept revision. Activity-pack loading or generation does not count as learning activity. At the configurable return threshold, three days by default, the Worker offers an unfinished current-pack session and a separate 10-minute recovery review. Invalid `RETURN_GAP_DAYS` values outside the integer range 1–30 produce an explicit configuration error.

Recovery selection uses only the current saved pack and never starts generation. It excludes flagged questions and concepts labelled **Recall successful**, while allowing an attempted question to return when its concept is **Review due** or **Needs practice**. Due, needs-practice and not-checked evidence determine stable ordering, with an immediate same-concept follow-up where available. The result contains at most three items and never exceeds ten estimated minutes. A longer gap does not create more work, and an honest empty completed review is persisted when nothing is eligible.

The browser uses neutral return copy and offers **Resume saved session** and/or **Start a 10-minute review**. It has no countdown, streak, missed-day total, penalty or automatic start. A recovery session remounts repeated questions under the new session ID and applies an earlier result only after that recovery item is completed. Existing local drafts, explicit save retry, confidence, flags and source links remain available.

Migration 0008 preserves existing migration-0007 sessions as `standard`, adds the `recovery` kind, and enforces 5/15/30-minute standard budgets and the fixed 10-minute recovery budget. Session creation keeps client-ID idempotency, explicit atomic replacement and the existing atomic attempt/progress/item completion path.

Automated coverage includes threshold boundaries, alternate configuration, no-activity behavior, five-day recovery, latest-interaction choice, repeated due questions, successful/flagged exclusions, budget and item caps, empty recovery, immutable request IDs, and saved-session resume. Browser-level return-flow coverage and the full repository gate are recorded in the pull request after final verification.

Still open: live-provider teaching-quality evaluation, targeted AI follow-up, numeric/rubric evidence, hints, manual review-date override, and the two-second saved-session target on a stated device. Recovery uses a saved fake-provider pack and does not establish those later claims.
