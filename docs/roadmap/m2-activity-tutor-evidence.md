# M2 activity tutor evidence

Status: **in progress**. This slice adds learner-requested hints and alternate
explanations to the local deterministic development flow. It does not complete
M2.

## Implemented boundary

- `hint` and `explain_again` use strict versioned request and response schemas.
- The Worker loads the current question and passes only its prompt, type,
  concept IDs and exact source objects to the replaceable tutor provider.
  Review keys, rubrics, learner drafts, answers and confidence are excluded.
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
  labels source-grounded output, and provides source-navigation controls.

The current provider is a deterministic fake for repeatable local testing. The
existing development-quality caveat applies to both activities and tutor text.
No live model capability, quota enforcement, teaching-quality review or
performance measurement is claimed.

## Deferred

Live provider and AI Gateway integration, per-user AI quotas, numeric
calculation policy and KaTeX, targeted follow-up,
prerequisite diagnosis, and supplementary explanations remain open.
