# M2 activity tutor evidence

Status: **in progress**. The live Workers AI path is implemented for learner-requested hints and alternate explanations. Content audit and deployed end-to-end evidence remain open, so this does not complete M2.

## Implemented boundary

- `hint` and `explain_again` use strict versioned request and response schemas.
- The Worker loads the current question and passes only its prompt, type,
  and source IDs/text to Workers AI through AI Gateway. Concept and request
  IDs, review keys, rubrics, learner drafts, answers and confidence are excluded.
- Prompt and source text are treated as untrusted data. The model returns only
  bounded text and source IDs; the Worker reconstructs request fields and exact
  complete citations before applying the response contract.
- Responses are bounded, require one to four byte-for-byte current-question
  citations, and are saved only while the same owner, space, pack, material and
  concept revision remain current.
- Request IDs are immutable. Ready requests replay without another provider
  call, pending requests conflict, and failed requests require an explicit new
  ID.
- Ready assistance is restored across devices. Hint and alternate-explanation
  evidence is derived by the server when an attempt is saved. Assisted correct
  MCQ attempts remain saved but do not advance review intervals.
- The UI keeps both tutor actions independent, preserves the current draft,
  discloses provider data sharing before a request, labels source-grounded
  output, and provides source-navigation controls.
- Provider, exact model, prompt version and output schema version are persisted
  with every reserved request. Live failures never fall back to fake help.
- A deterministic post-provider gate compares tutor text with server-held recall,
  MCQ and calculation review keys. Direct or minimally reformatted answer
  leakage fails the request before persistence or display.

Automated tests use a deterministic fake without a live AI binding. They cover
quota enforcement, immutable replay, explicit retry, concurrency, assistance
effects, deletion fences, source validation, minimized live request data,
gateway privacy/cache options, fail-closed configuration and provenance.
Adversarial tests cover direct/formatted recall and MCQ leakage, final numeric
results and a permitted directional calculation clue. No live tutor
teaching-quality, latency, usage or cost claim is established.

Verification on 12 October 2026 passed 13 focused Worker tests, all 49
Playwright tests, formatting, lint, type checking, the 350-line limit across
235 authored files, 97 local documentation links, nine maintenance tests, and
the production web build plus Worker deployment dry run. Migration `0021` was
also applied to remote D1 database `tai`.

## Deferred

Targeted follow-up, prerequisite diagnosis, live content audit and measured
provider behavior remain open. A model can still make a clue too revealing
from source text, so demo hints require manual review and never count as
independent recall evidence.
