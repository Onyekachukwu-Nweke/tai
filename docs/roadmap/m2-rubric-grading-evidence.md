# M2 source-grounded rubric grading evidence

Status: implemented locally with a deterministic fake provider; live model quality and provider access remain unverified.

This slice grades saved `explain` attempts against the canonical rubric and exact source excerpts already stored with the current activity pack. The browser sends only a request ID and attempt ID. The Worker resolves the learner, saved answer, current question, rubric, and sources before calling the provider.

The response contract accepts the outcomes `supported`, `partial`, `not_supported`, and `uncertain`. It bounds overall and per-element feedback, requires one result for every unchanged canonical rubric element, and rejects citations that do not exactly match the question sources. The deterministic fake provider always returns `uncertain`; it exercises the integration without claiming semantic grading quality.

Grading requests are owner-scoped and reserved before provider work. An identical ready request replays its saved response without another provider call. Failed requests remain failed and require an explicit retry with a new request ID. Final persistence checks that the attempt and current pack revision still exist, the space is not deleted, and the question has not been flagged. Rubric outcomes do not update concept progress.

The explanation attempt is persisted before grading begins. If grading fails, the saved attempt and browser draft remain, and the learner gets an explicit retry control. Successful feedback and its source links restore after reload. The interface labels the fake-provider limitation and exposes outcome text in addition to visual styling.

Automated evidence covers strict schema bounds, unchanged rubric elements, exact citations, server-built private context, owner isolation, immutable request replay, failed-request retry rules, flagged-question rejection, no progress advancement, draft retention after grading failure, explicit retry, source-linked feedback, and reload restoration.

Remaining M2 work includes live provider and quota integration, content-quality review, scenario questions, numeric/equation checking, working-step feedback, and targeted follow-up. No live-provider quality, cost, latency, or retention claim has been established.
