# M0 Workers AI live-provider evidence

**Date:** 11 October 2026  
**Status:** concept and activity-pack adapters and synthetic-binding verification complete; Cloudflare authentication, core remote resources and a minimal live model invocation are verified. Deployed OAuth remains blocked by the public production origin and callback.

## Implemented slice

Concept generation can use Workers AI through a named AI Gateway. Local development and deployment select `workers_ai` with the same binding, gateway, model, quotas, D1 and R2 configuration; only `APP_ORIGIN` differs. Wrangler emulates D1/R2 locally, while the AI binding reaches Cloudflare and consumes the account allowance. Automated tests explicitly select deterministic fake providers. Live failures never fall back to fake educational content.

Requests send bounded saved source chunks, request JSON schema output, cap output tokens, bypass caching, and set per-request gateway log collection off. Returned data still passes application schema and source-association validation before persistence. D1 stores the provider, exact model, prompt version, and output schema version with the concept request so a later configuration change cannot relabel saved content.

Activity packs, source-grounded rubric grading, hints and alternate explanations use the same live path and persist provider, model, prompt and schema provenance. Calculation-question creation remains excluded from the pack adapter until numeric keys receive deterministic review; rubric feedback for an existing calculation assesses working steps only and cannot override application-controlled final-answer correctness. Follow-up and practical tasks still use fake providers.

## Automated evidence

Synthetic binding tests cover the request shape, named gateway, disabled log collection and cache, model rejection, malformed JSON, invented citations, ambiguous draft IDs, invalid configuration, and exact provider metadata. Integration tests cover quota reservation, idempotent replay, ownership, late-write rejection, retry behavior, provenance reload, and retention of the last successful provenance after a failed retry. Automated tests use an isolated Wrangler config without an AI binding and make no paid calls.

## Live gate still open

The account API token was verified on 11 October 2026. Remote R2 bucket `tai-originals`, D1 database `tai`, and AI Gateway `tai` exist. All migrations through `0021` were applied remotely. The gateway reports body logging disabled, authentication enabled, zero-data-retention enabled, no cache TTL, and a bounded rate limit. Better Auth and Google OAuth values were uploaded as encrypted production Worker secrets. No secret values were recorded.

A minimal direct invocation of `@cf/meta/llama-3.3-70b-instruct-fp8-fast` through gateway `tai` returned structured JSON successfully on 11 October 2026. It used synthetic content and establishes authenticated model access only; latency, usage, cost, source fidelity, and comparative quality were not measured.

The Cloudflare account does not yet have a `workers.dev` subdomain, so the production HTTPS origin and matching Google OAuth callback cannot be finalized. `APP_ORIGIN` remains local and no application deployment has been made. Token/cost measurement, model comparison, activity-pack content audit, and deployed end-to-end behavior remain unverified.

Before the deployed walkthrough:

1. Open Workers & Pages in the Cloudflare dashboard once to register the account's `workers.dev` subdomain, or choose a custom domain.
2. Set the deployed HTTPS `APP_ORIGIN` and matching Google OAuth callback.
3. Keep the checked-in low daily quotas and recheck deployed bindings and privacy settings before learner use.
4. Run the same bounded quantitative and scenario fixtures against accessible Workers AI JSON-capable models and record exact model IDs, prompt/schema version, latency, usage, cost, schema compliance, and source fidelity.

Live evaluation must remain separate from CI and must use synthetic, non-sensitive material until the privacy gate passes.
