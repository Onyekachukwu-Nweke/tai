# AI provider, model choice, and budget

**Scope decision:** 11 October 2026. TAI uses Workers AI through Cloudflare AI Gateway for the hackathon. Amazon Bedrock and other providers are outside scope. Live account access, calls, and costs must still be measured.

## Runtime path

All model calls follow Worker → AI Gateway → Workers AI. The Worker uses its `AI` binding, names the configured gateway on every request, bypasses gateway caching for learner-specific generations, and validates the returned JSON and every cited source ID before persistence. The adapter remains replaceable, but there is no provider fallback in the hackathon build.

AI Gateway can retain prompt and response bodies when logging is enabled. Disable body logging in the gateway dashboard before sending learner material. Do not rely on an automatically created default gateway because its privacy settings have not been reviewed. Worker logs must not contain prompts, document text, or raw learner answers.

Current implementation references: [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/), [Workers AI through AI Gateway](https://developers.cloudflare.com/ai-gateway/usage/worker-binding-methods/), [JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/), [AI Gateway logging](https://developers.cloudflare.com/ai-gateway/observability/logging/), [models](https://developers.cloudflare.com/workers-ai/models/), and [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

## Live-provider gate

Before using learner material, record non-secret evidence that:

- the Workers AI binding works in the target Cloudflare account;
- the named AI Gateway exists and body logging is disabled;
- the operator kill switch and D1 per-user quotas are enabled;
- selected model IDs are accessible and their current rates are known;
- malformed JSON, invented source IDs, timeouts, and quota failures produce an explicit retry state without fake output;
- replaying an identical saved request does not make another paid call.

Automated tests use fake bindings and never make paid calls. Live evaluation is a separate, opt-in activity using synthetic, non-sensitive fixtures.

## Model evaluation

Compare at least two current Workers AI models that support the required structured response. Use the same prompt version, schemas, token budgets, quantitative fixture, and scenario/reasoning fixture. Record:

- exact model and prompt/schema versions;
- source fidelity and rejected unsupported citations;
- schema compliance and usable-output rate;
- question usefulness and independently checked calculation keys;
- grading, hint, and follow-up quality where implemented;
- input/output size, reported token usage, latency, and actual cost.

Choose sufficient learning quality before price. Per-task model routing is allowed when measurements justify it. If only one model is accessible, record the comparison as blocked. JSON mode improves structure but does not replace application validation, and it currently prevents streaming for that request shape; do not claim a streaming result from a non-streamed evaluation.

## Spending controls

```text
cost per pack ≈ concepts (amortized) + pack generation + expected grading calls + follow-ups
projected total = inference + evaluations + Workers/D1/R2 usage beyond free tiers
```

Controls, in order of strength, are the operator kill switch, per-user daily quotas in D1 before each call, per-task input/output caps, AI Gateway rate limits, and at most one prefetched pack. Set an owner-approved cash ceiling and billing alert. Existing saved packs and progress remain usable when calls are disabled or quota is exhausted. Never fabricate output or silently fall back to a fake provider.
