# AI provider, model choice, and budget

**Public-source check:** 6 October 2026. **Account status:** not inspected. No accounts, model calls or charges were made for this plan.

## Approach

All model calls go Worker → Cloudflare AI Gateway → provider. Two providers are candidates:

| | Workers AI | Amazon Bedrock |
| --- | --- | --- |
| Models | Open models, e.g. gpt-oss-120b, Kimi K2.6, GLM-5.3, DeepSeek V4, Llama 4, Qwen | Anthropic Claude (Haiku, Sonnet), Amazon Nova |
| Integration | Native Worker binding; no external keys | AWS credentials as Worker secrets; requests signed (e.g. `aws4fetch`); model access enabled per account |
| Cost | 10,000 free neurons/day, then $0.011 per 1,000 neurons on Workers Paid; some large models need billing enabled | Per-token pricing; may be covered by AWS credits if the grant includes the chosen model |
| Structured output | Advertised for some models (e.g. Kimi, GLM); verify per model | Strong schema-following expected for Claude; verify |

Keep one adapter interface so each task kind can route to a different model. Network distance is a minor part of latency; model time to first token and tokens/second dominate.

[Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Workers AI models](https://developers.cloudflare.com/workers-ai/models/), [AI Gateway providers](https://developers.cloudflare.com/ai-gateway/usage/providers), [Bedrock model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html).

## Model selection (quality first)

Question quality and fair grading are the product. In M0/M2, run the same two permitted documents (one quantitative, one scenario/reasoning-heavy), prompts, task mix and review rubric through:

| Candidate | Provider | Role in the comparison |
| --- | --- | --- |
| gpt-oss-120b | Workers AI | Strong open reasoning model, no external account |
| Kimi K2.6 or GLM-5.3 | Workers AI | Open models advertising structured output |
| Claude Haiku 4.5 | Bedrock | Likely stronger grading and scenario quality; confirm exact Bedrock model ID and access |
| Claude Sonnet (optional) | Bedrock | Upper quality reference, possibly for grading only |

Score each on: source fidelity, scenario usefulness, independently checked calculation keys, rubric/working feedback with appropriate uncertainty, hints and follow-up, schema compliance rate, then time to first validated item, tokens/second and cost per usable pack. Per-task routing is allowed (for example a cheaper model for concepts and MCQs, a stronger one for grading). If only one provider is accessible, record the comparison as blocked rather than passed.

## M0 readiness checklist

Record non-secret results in a dated decision note.

- Cloudflare account on Free or Paid plan; Workers AI access to the candidate models; AI Gateway created with body logging disabled.
- AWS account status, credit balance, exclusions and expiry; Bedrock Region and model access for Claude. Skip if Bedrock is not pursued.
- Current rates for each selected model.
- Owner-selected maximum cash spend and per-user daily quotas.
- One small synthetic call per candidate through AI Gateway: token use, latency, schema and citation behavior.

Until these pass, develop against the fake provider and label any demo accordingly. Automated tests never call a paid model.

The local per-user reservation and kill-switch implementation is documented in [AI quota evidence](ai-quota-evidence.md). Its configured limits are development defaults, not a measured or owner-approved production budget.

## Cost planning

```text
cost per pack ≈ concepts (amortized) + pack generation + expected grading calls + follow-ups
projected total = inference + evaluations + Workers/D1/R2 usage beyond free tiers
```

Measure on representative sections rather than assuming. Controls, in order of strength: per-user daily quotas in D1 checked before each call; per-task token caps; AI Gateway rate limits; at most one prefetched pack; operator kill switch. Billing alerts are visibility, not a hard cap. When quota or budget is exhausted, keep existing packs and progress usable and show a clear reason. Never fabricate output or silently switch to an unapproved paid provider.
