# M2 learner-requested targeted follow-up evidence

This slice adds one learner-requested practice prompt after a saved explanation
or scenario response has ready rubric feedback with an assessed gap. The
browser sends only a request ID and attempt ID. The Worker resolves the saved
answer, exact saved grade, current canonical question, concept IDs and sources.

Gap selection is deterministic application logic. It selects
`not_supported`, then `partial`, then `uncertain`, preserving canonical rubric
order within the same outcome. A supported rubric element is not a gap. The
interface calls the result an assessed gap and does not diagnose a learner
misconception from one response.

The strict provider response must retain the request, attempt, pack and question
IDs, selected criterion, gap outcome and concept IDs. Every citation must match
a canonical question source exactly. Completion is rejected if the pack
revision, saved grade, flag or study-space deletion changes while generation is
in flight. Requests are learner scoped, retry safe, and limited to one saved
follow-up per attempt. Ready requests replay, pending requests conflict, and a
failed request requires an explicit retry with a new ID.

The deterministic fake provider exercises persistence and recovery without
claiming teaching quality. The learner explicitly asks for the follow-up, can
retry a failure, reopen its supporting source, and recover the saved prompt
after reload. The prompt has no response submission or grading control in this
bounded slice.

Automated evidence covers strict identifiers and source references,
deterministic gap priority, private server-built context, owner isolation,
idempotent replay, one-success enforcement, invalid provider output, changed
grade rejection, explicit retry, reload restoration, and source navigation.

Still open are follow-up answer submission and grading, calculation/equation
activities and working feedback, live-provider and quota integration, content
quality review, and live cost, latency and retention evidence.
