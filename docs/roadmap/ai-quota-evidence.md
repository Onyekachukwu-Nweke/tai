# Per-user AI quota foundation evidence

Status: **implemented locally; live-provider budget validation remains open**.

Every current provider invocation is preceded by an owner-scoped D1 reservation. The ledger uses a UTC day, an overall daily limit, and limits for concepts, packs, grading, support, and future practical work. Task kinds distinguish concepts, packs, rubric and follow-up grading, hints, alternate explanations, targeted follow-ups, and the reserved prefetch/practical extensions.

The Worker fails closed when `AI_CALLS_ENABLED` is false or any limit is absent or malformed. A category limit of zero intentionally disables that category. A limit denial returns its category, ISO UTC reset time, and `Retry-After` in structured HTTP 429 data. Disabled or invalidly configured calls return structured HTTP 503 data with `ai_disabled`. Existing saved materials, packs, attempts, feedback, and local grading routes do not reserve credits.

Exact successful request replays are resolved before quota reservation and do not consume another credit. Ledger identity combines learner, task kind, and opaque operation ID, so two task kinds may safely receive the same UUID. A reservation stays pending through the provider call, schema validation, and durable domain save, then becomes completed. Provider, schema, and late-save failures become failed; both completed and failed rows remain consumed. Domain reservations are marked failed on quota denial so an explicit retry needs a new request ID. Pending ledger reservations older than five minutes become failed and consumed; the same task and operation ID cannot be reused.

The ledger contains only learner ID, opaque operation ID, UTC day, category, task kind, state, and timestamps. It stores no prompts, answers, source text, provider response, token data, or secrets. Account deletion cascades to ledger rows; deleting one study space does not restore daily credits.

Automated coverage exercises concurrent boundary admission, total and category limits, user isolation, UTC rollover, kill switch, invalid configuration, stale reservations, operation reuse, account deletion, and route-level provider suppression/domain failure reconciliation. Fake providers are charged because they exercise the same production call seam. Live cost, tokens, provider limits, and AI Gateway controls are still unmeasured.
