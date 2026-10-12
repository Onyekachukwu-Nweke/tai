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

The runtime selects live Workers AI providers through AI Gateway, while tests
inject deterministic fake providers. Generation omits the prior learner answer,
application IDs, concept IDs and hidden keys. Grading receives only the practice
prompt, saved answer, targeted criterion and excerpts. Responses rebuild trusted
IDs and citations locally, reject invalid sources, bypass caches and disable logs. The learner explicitly asks for the follow-up, can
retry a failure, reopen its supporting source, and recover the saved prompt
after reload. A learner can now save one immutable response to that prompt and
request bounded feedback against only the saved targeted criterion and exact
saved sources. Outcomes are `supported`, `partial`, `not_supported`, or
`uncertain`; the deterministic fake provider returns `uncertain` and makes no
teaching-quality claim.

Follow-up answers are committed before grading begins. Attempt IDs replay only
the same answer, changed reuse conflicts, and a failed grade keeps the saved
answer while requiring an explicit retry with a new grade request ID. A partial
unique index permits only one pending or ready grade per answer, preventing
concurrent provider calls. A pending reservation has a five-minute lease;
explicit retry with a new request ID atomically expires an older orphan, while
a fresh pending request remains a conflict. Finishing a grade rechecks learner ownership, the
current material/selection revision, deletion and flag state, the unchanged
originating rubric response, and the unchanged generated follow-up. Saved
answers and source-linked feedback restore after reload and never advance
concept progress.

Provider provenance is reserved with both calls and live configuration fails
closed without its binding and gateway. Automated evidence covers strict identifiers and source references,
deterministic gap priority, private server-built context, owner isolation,
idempotent replay, one-success enforcement, invalid provider output, changed
grade rejection, concurrent reservation, explicit retry, answer/feedback
reload restoration, and source navigation.
Before an explicit browser retry creates a new grade request, it reloads saved
state so a ready grade whose HTTP response was lost is restored without another
provider call.

Per-call quotas cover both live tasks. Still open are quantitative generation,
content quality review, and live cost, latency and retention evidence. Calculation
follow-up prompts pass the same deterministic expected-value and worked-solution
concealment gate as tutor help before persistence.

Verification on 12 October 2026 passed 22 focused follow-up and quota tests, 12
Workers AI adapter boundary tests, type checking, the 350-line limit across 241
authored files, a fresh migration chain through `0022`, and the production web
build plus Worker deployment dry run. Migration `0022` was also applied to
remote D1 database `tai`. Two full-suite attempts encountered unrelated test
isolation and timeout failures; affected follow-up tests passed independently.
