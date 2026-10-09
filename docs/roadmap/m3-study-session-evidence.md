# M3.1 study-session evidence

Status: bounded M3.1 slice implemented; M3 remains in progress.

TAI now prepares persisted **learn**, **review**, and **practise** sessions for the learner's current saved activity pack. The learner chooses 5, 15, or 30 minutes and may focus on a selected concept. The deterministic selector excludes flagged and already-attempted questions, prioritizes due review, adds same-concept practice when it fits, preserves pack order as a stable tie-break, and never reports an estimate above the chosen budget. Each selected item has a plain-language reason.

The Worker owns item IDs, order, estimates and reasons. D1 stores the chosen order and completion state so an active or completed session restores on another signed-in device. A client-generated session ID and server-stored settings fingerprint make an identical creation retry return the original session after a lost response; reusing that ID with different settings is rejected. Replacing an active session is explicit and atomic; preparing a new pack supersedes an active session tied to the old pack. An honest empty result is saved when no eligible question fits.

A session-bound attempt is accepted only for a pending question in the active owner-scoped session. Attempt insertion, eligible progress recomputation, item completion and final session completion run in one D1 batch. The existing attempt ID remains the idempotency key: an identical retry returns the saved response, while reuse with different content returns a conflict. The browser keeps its existing draft and explicit retry behavior and shows the session summary only after the final save has been acknowledged and refreshed from the server.

Automated coverage checks budget fit, due and same-concept ordering, concept override, completed/flagged exclusion, persisted restore, explicit replacement, out-of-session rejection and final completion. Browser coverage exercises session-filtered questions alongside drafts, sources and saved results. Exact final commands and counts belong in the pull request description.

Still open: the M3.4 inactivity threshold, Resume/short-review fork, 10-minute recovery option and five-day simulation. Custom time, targeted AI follow-up, numeric/rubric evidence, hints and manual review-date override also remain deferred. This slice uses saved fake-provider packs and does not establish live-provider teaching quality or the two-second target on a stated device.
