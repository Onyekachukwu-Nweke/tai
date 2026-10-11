# M0 Workers AI live-provider evidence

**Date:** 11 October 2026  
**Status:** adapter and synthetic-binding verification complete; live account invocation blocked by missing Cloudflare authentication and production resource values.

## Implemented slice

Concept generation can use Workers AI through a named AI Gateway. The production environment selects `workers_ai`; local development and automated tests select the deterministic fake provider unless explicitly configured. Live failures never fall back to fake educational content.

Requests send bounded saved source chunks, request JSON schema output, cap output tokens, bypass caching, and set per-request gateway log collection off. Returned data still passes application schema and source-association validation before persistence. D1 stores the provider, exact model, prompt version, and output schema version with the concept request so a later configuration change cannot relabel saved content.

This is the first live adapter slice. Activity packs, rubric grading, hints, follow-up, and practical tasks still use fake providers.

## Automated evidence

Synthetic binding tests cover the request shape, named gateway, disabled log collection and cache, model rejection, malformed JSON, invented citations, invalid configuration, and exact provider metadata. Existing concept tests cover quota reservation, idempotent replay, ownership, late-write rejection, and retry behavior. Automated tests make no paid calls.

## Live gate still open

`wrangler whoami` reported that this workstation is not authenticated. The production Wrangler environment also retains placeholders for the deployed HTTPS `APP_ORIGIN` and remote D1 database ID. No live model call, token/cost measurement, model comparison, or deployed end-to-end claim has been made.

Before the first live call:

1. Authenticate Wrangler to the intended Cloudflare account.
2. Create or select a named AI Gateway and confirm body logging is disabled in its dashboard settings.
3. Create the remote D1 database and R2 bucket, apply all migrations through `0018`, and place their real identifiers in deployment configuration.
4. Set the deployed HTTPS origin and matching Google OAuth callback.
5. Start with `AI_CALLS_ENABLED=false`, low daily quotas, and an owner-approved spend ceiling; enable calls only after the bindings and privacy settings are verified.
6. Run the same bounded quantitative and scenario fixtures against two accessible Workers AI JSON-capable models and record exact model IDs, prompt/schema version, latency, usage, cost, schema compliance, and source fidelity.

Live evaluation must remain separate from CI and must use synthetic, non-sensitive material until the privacy gate passes.
