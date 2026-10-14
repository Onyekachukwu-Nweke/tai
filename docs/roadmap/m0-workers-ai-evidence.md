# M0 Workers AI live-provider evidence

**Date:** 11 October 2026  
**Status:** concept and activity-pack adapters, synthetic-binding verification, and a bounded live-evaluation tool are complete; Cloudflare authentication, core remote resources and a four-call two-model comparison are verified. Both model candidates failed the first manual pack-quality audit, so selection remains open. The application is deployed; a completed Google consent walkthrough remains a release check.

## Implemented slice

Concept generation can use Workers AI through a named AI Gateway. Local development and deployment select `workers_ai` with the same binding, gateway, model, quotas, D1 and R2 configuration; only `APP_ORIGIN` differs. Wrangler emulates D1/R2 locally, while the AI binding reaches Cloudflare and consumes the account allowance. Automated tests explicitly select deterministic fake providers. Live failures never fall back to fake educational content.

Requests send bounded saved source chunks, request JSON schema output, cap output tokens, bypass caching, and set per-request gateway log collection off. Returned data still passes application schema and source-association validation before persistence. D1 stores the provider, exact model, prompt version, and output schema version with the concept request so a later configuration change cannot relabel saved content.

Activity packs, source-grounded rubric grading, hints, alternate explanations, targeted follow-up generation and grading, and practical-task preparation use the same live path and persist provider, model, prompt and schema provenance. Calculation-question creation remains excluded from the pack adapter until numeric keys receive deterministic review; rubric feedback for an existing calculation assesses working steps only and cannot override application-controlled final-answer correctness. Practical tasks send one concept label and bounded source ID/text pairs, rebuild trusted identifiers locally, and pass deterministic desk-work safety checks before persistence.

## Automated evidence

Synthetic binding tests cover the request shape, named gateway, disabled log collection and cache, model rejection, malformed JSON, invented citations, ambiguous draft IDs, invalid configuration, and exact provider metadata. Integration tests cover quota reservation, idempotent replay, ownership, late-write rejection, retry behavior, provenance reload, and retention of the last successful provenance after a failed retry. Automated tests use an isolated Wrangler config without an AI binding and make no paid calls.

The [live-provider evaluator](live-provider-evaluation.md) provides a separate exact-consent path for four sequential synthetic calls across two models and the production concept/activity-pack adapters. It produces an ignored, sanitized report and cannot be reached by normal tests. Its fake-transport tests do not establish live model quality, usage, cost, or availability.

## Live gate still open

The account API token was verified on 11 October 2026. Remote R2 bucket `tai-originals`, D1 database `tai`, and AI Gateway `tai` exist. All migrations through `0023` were applied remotely. The gateway reports body logging disabled, authentication enabled, zero-data-retention enabled, no cache TTL, and a bounded rate limit. Better Auth and Google OAuth values were uploaded as encrypted production Worker secrets. No secret values were recorded.

On 12 October 2026, the local Worker loaded the configured Better Auth and Google credentials and accepted a social sign-in initiation request. It returned Google Accounts authorization with state and PKCE parameters and the registered `http://localhost:8787/api/auth/callback/google` redirect URI. This verifies local flow initiation and callback construction; it does not claim a completed Google account consent walkthrough or deployed OAuth.

A minimal direct invocation of `@cf/meta/llama-3.3-70b-instruct-fp8-fast` through gateway `tai` returned structured JSON successfully on 11 October 2026. It used synthetic content and establishes authenticated model access only; latency, usage, cost, source fidelity, and comparative quality were not measured.

On 14 October 2026, TAI was deployed to
`https://tai.nwekeejioforscheller.workers.dev` with D1 `tai`, R2
`tai-originals`, the Workers AI binding, and encrypted `APP_ORIGIN`, Better Auth,
and Google OAuth bindings. Remote D1 reported no pending migrations. Production
smoke checks returned HTTP 200 for the app shell, hashed web asset, signed-out
session endpoint, and Google authorization initiation. The generated OAuth
redirect URI is
`https://tai.nwekeejioforscheller.workers.dev/api/auth/callback/google`.
This verifies deployed initiation and callback construction; it does not claim a
completed Google consent/callback walkthrough. The comparison measured latency,
tokens and neurons, but Cloudflare returned no dollar cost. Both v1 packs failed
manual quality review; `activity-pack-v2` now fails closed on single-type packs
and strengthens source-only instructions, but it has not received another live
run.

Before the deployed walkthrough:

1. Add the generated production callback URI to the Google OAuth client's authorized redirect URIs if it is not already registered.
2. Complete one Google consent/callback walkthrough and verify the session survives reload.
3. Keep the checked-in low daily quotas and recheck deployed bindings and privacy settings before learner use.
4. Run the bounded evaluator against the two configured Workers AI models, then manually audit its validated output for source fidelity and usefulness. Record provider-reported usage and cost only when available; do not replace missing values with estimates.

Live evaluation must remain separate from CI and must use synthetic, non-sensitive material until the privacy gate passes.
