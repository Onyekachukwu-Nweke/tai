# M2 scenario activity evidence

Status: implemented locally with deterministic fake providers; live teaching
quality remains unverified.

The canonical activity contract now supports a `scenario` question with a
concrete situation, one to five explicit bounded assumptions, one to three
concepts, exact saved sources, a one-to-ten-minute estimate, and a private
one-to-five-element rubric. The learner response includes the assumptions and
source links but excludes the rubric. The fake provider deterministically adds
one four-minute scenario covering the first two selected concepts to its
self-contained four-item pack.

Scenario answers reuse the persisted free-text attempt path. They save before
rubric grading, retain the browser draft when grading fails, require explicit
retry, and restore both the saved attempt and source-linked rubric feedback
after reload. Hints and alternate explanations receive only the question type,
prompt, concept IDs and exact sources; scenario assumptions, private rubrics
and learner answers are not included. Rubric grading resolves the saved answer,
private rubric and sources server-side. Scenario attempts remain unscored and
do not advance concept review progress.

The interface labels the activity as a scenario, lists its assumptions, keeps
the response untimed, and preserves existing keyboard-accessible source
navigation. Automated coverage checks contract bounds, learner-safe output,
two-concept coverage, exact citations, persisted unscored attempts, no progress
advancement, private rubric/tutor contexts, grading failure and explicit retry,
reload restoration, and source navigation.

Remaining M2 work includes calculation/equation activities, numeric checking,
working-step feedback, targeted follow-up, live provider and quota integration,
and content-quality review. No live-provider quality, cost, latency, or
performance claim has been established.
