# M0 Workers AI live-provider evidence

**Date:** 11 October 2026  
**Status:** adapter and synthetic-binding verification complete; Cloudflare authentication and core remote resources verified. Live invocation remains blocked by the public production origin and OAuth callback.

## Implemented slice

Concept generation can use Workers AI through a named AI Gateway. The production environment selects `workers_ai`; local development and automated tests select the deterministic fake provider unless explicitly configured. Live failures never fall back to fake educational content.

Requests send bounded saved source chunks, request JSON schema output, cap output tokens, bypass caching, and set per-request gateway log collection off. Returned data still passes application schema and source-association validation before persistence. D1 stores the provider, exact model, prompt version, and output schema version with the concept request so a later configuration change cannot relabel saved content.

This is the first live adapter slice. Activity packs, rubric grading, hints, follow-up, and practical tasks still use fake providers.

## Automated evidence

Synthetic binding tests cover the request shape, named gateway, disabled log collection and cache, model rejection, malformed JSON, invented citations, invalid configuration, and exact provider metadata. Existing concept tests cover quota reservation, idempotent replay, ownership, late-write rejection, and retry behavior. Automated tests make no paid calls.

## Live gate still open

The account API token was verified on 11 October 2026. Remote R2 bucket `tai-originals`, D1 database `tai`, and AI Gateway `tai` exist. All migrations through `0018` were applied remotely. The gateway reports body logging disabled, authentication enabled, zero-data-retention enabled, no cache TTL, and a bounded rate limit. Better Auth and Google OAuth values were uploaded as encrypted production Worker secrets. No secret values were recorded.

The Cloudflare account does not yet have a `workers.dev` subdomain, so the production HTTPS origin and matching Google OAuth callback cannot be finalized. `APP_ORIGIN` remains a local placeholder and no application deployment or live model call has been made. Token/cost measurement, model comparison, and deployed end-to-end behavior remain unverified.

Before the first live call:

1. Open Workers & Pages in the Cloudflare dashboard once to register the account's `workers.dev` subdomain, or choose a custom domain.
2. Set the deployed HTTPS `APP_ORIGIN` and matching Google OAuth callback.
3. Start with `AI_CALLS_ENABLED=false`, low daily quotas, and an owner-approved spend ceiling; enable calls only after the deployed bindings and privacy settings are rechecked.
4. Run the same bounded quantitative and scenario fixtures against two accessible Workers AI JSON-capable models and record exact model IDs, prompt/schema version, latency, usage, cost, schema compliance, and source fidelity.

Live evaluation must remain separate from CI and must use synthetic, non-sensitive material until the privacy gate passes.
