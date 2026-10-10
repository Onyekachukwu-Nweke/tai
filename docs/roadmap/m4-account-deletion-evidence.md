# M4.3 account deletion evidence

Scope: application-controlled account and learner-data deletion for FR-11. This advances M4.3 but does not complete M4.

## Implemented behavior

- `DELETE /api/account` requires a valid session and the exact configured application origin.
- The Worker writes a durable owner deletion fence and marks every owner-scoped study space deleted before cleanup. Mutation routes reject fenced accounts, while study-space and material reservations also enforce the fence atomically to close requests that passed middleware just before deletion began.
- Cleanup reads original-file keys only from owner-scoped D1 material records. The first pass moves writing imports to `cleanup` and returns a validated `202 cleanupPending` response without a timeout. A cleanup row is a cancel request and is never deletion-eligible: retries retain its R2 key ledger, user and session until the upload writer deletes its exact immutable key and acknowledges cleanup by moving the row to `failed`. Only ready or acknowledged-failed records are removed by a later deletion retry. R2 failure likewise retains the user and session for retry. No deletion queue or automatic replay is used.
- After every recorded original is removed, deleting the user row last removes sessions, provider account data, study spaces, extracted material, activities, attempts, progress, and AI quota ledger entries through verified foreign-key cascades.
- The settings control requires an irreversible confirmation and explains both processing and the boundary of application-controlled deletion. Browser activity drafts for that user are cleared only after a confirmed `204` response.
- Quota exhaustion and the AI kill switch now produce specific, safe UI messages without exposing provider details or learner content.

## Automated evidence

Worker tests cover authentication, exact-origin rejection, owner isolation, dependent D1 and R2 deletion, session invalidation, quota-ledger deletion, R2 failure retry, a controlled active-writer handoff, atomic creation/material rejection after a middleware race, and rejection of a representative late concept result. Browser coverage checks disclosure, confirmation, pending-cleanup status, explicit retry, and user-scoped draft cleanup.

## Limits

Deletion removes application-controlled data only after every tracked original is safely settled. A hard-terminated upload writer can leave `cleanupPending` until operational reconciliation; the endpoint does not race that writer or discard its durable ledger. It does not retract excerpts or answers already processed by an AI provider, and no production provider-retention or compliance claim has been established. M4.3 and M4 remain in progress, alongside the separate live-provider, practical-task, resource-catalog, and accessibility work.
