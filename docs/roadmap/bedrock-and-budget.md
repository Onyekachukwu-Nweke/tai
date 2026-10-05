# Bedrock, AWS credits, and spending readiness

**Public-source check:** 5 October 2026. **Account-specific status:** unknown. No account inspection, subscriptions, provisioning, model calls, or charges were performed for this roadmap.

## What the $200 offer means

AWS advertises up to $200 in Free Tier credits for eligible new customers: $100 at signup and up to $100 earned through activities. Existing or previous customers are not automatically eligible. The Free plan runs for up to six months or until credits are exhausted; credits expire twelve months after account creation. Paid-plan usage beyond eligible credit coverage can incur charges. Verify the actual account and grant before budgeting. [AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/).

This is not a dedicated or guaranteed $200 Bedrock allocation. A Free plan has service restrictions, so the selected model and integration must be checked in the actual account. Do not upgrade a plan merely because a tutorial assumes it. [AWS account-plan documentation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html).

Credit terms can exclude Marketplace charges unless specifically authorized. Do not generalize coverage for all third-party models from Bedrock availability. AWS Activate separately advertises third-party Bedrock coverage, but that does not establish the terms of a Free Tier grant. Read the grant's eligible-services/exclusions and verify the selected model's billing treatment. [Promotional-credit terms](https://aws.amazon.com/awscredits/), [Activate benefits](https://startups.aws.com/lp/activate-benefits-overview).

## Recommended provider approach

Use a server-only AWS SDK v3 Bedrock Runtime adapter through Converse/ConverseStream in a stateless endpoint. Browser extraction supplies bounded selected text; originals, packs and progress are not retained on the server. Keep model ID, Region and optional inference-profile ID configurable. Validate model-specific capabilities; a common API does not guarantee identical structured-output behavior. Use application schemas, citation checks and bounded repair attempts. [Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html).

Select quality-first: question quality and fair grading are the product. Evaluate at least one smaller and one stronger candidate on the same two source documents (one quantitative, one reasoning/scenario-heavy), prompts, task mix and review rubric, without assuming quality or access:

| Candidate | Tier | Reason to evaluate | Gate |
| --- | --- | --- | --- |
| Amazon Nova Lite (`amazon.nova-lite-v1:0`) or Nova 2 Lite | Smaller | Low-cost baseline for concepts, recall and MCQs | Supported account/Region; grounded question quality and rubric uncertainty |
| Amazon Nova Micro (`amazon.nova-micro-v1:0`) | Smaller | Cheapest text-only option for already extracted chunks | Same fixtures; likely limited for scenarios, calculations and working feedback |
| Anthropic Claude Haiku 4.5 through Bedrock | Stronger | Candidate default if smaller models produce weak scenarios, incorrect calculation keys or poor rubric feedback | Exact Bedrock model ID, first-use requirement, credit eligibility, cost and latency |
| Anthropic Claude Sonnet through Bedrock | Strongest | Upper quality reference; possible choice for grading/working feedback only | Same as Haiku; justify cost against measured quality gain |

Score each candidate on source fidelity, scenario usefulness, independently checked numeric keys, working/rubric feedback with appropriate uncertainty, hints and follow-up, then latency and cost per usable pack. Routing tasks to different models (e.g. a smaller model for concepts/MCQs, a stronger one for scenarios and grading) is allowed if measurements justify it. If only one candidate is accessible, record the comparison as blocked.

Nova candidate capabilities and identifiers come from [Nova v1 specifications](https://docs.aws.amazon.com/nova/latest/userguide/what-is-nova.html) and the [Nova model catalog](https://aws.amazon.com/nova/models/). These are candidate choices, not a claim that older or newer generations are best for TAI. Native PDF input is unnecessary because TAI needs its own extracted source references.

Shortlist `us-east-1` and `eu-west-2` for initial availability checks, then choose using the account's actual model catalog, latency, price and routing needs. Do not assume a learner's location implies regional model availability. If an inference profile routes across Regions, record that processing behavior and include it in disclosure. [Nova regional specifications](https://docs.aws.amazon.com/nova/latest/userguide/what-is-nova.html).

Model activation can require Marketplace permissions and provider prerequisites; Anthropic has a first-time-use requirement. Keep administrative model-enablement permissions separate from the application's narrowly scoped runtime role. Prefer temporary AWS credentials locally and an execution role in AWS. [Bedrock model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html).

## M0 readiness checklist

Record non-secret results in a dated decision note; do not commit credentials or account billing screenshots containing private details.

- Account creation/eligibility, Free or Paid plan, actual remaining credit, expiry, and exact service/model exclusions.
- Chosen Region, model/inference-profile ID, quotas, required activation and whether inference crosses Regions.
- Current input/output rates and any relevant cache/reasoning charges from the [Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/).
- Static hosting, streaming endpoint and metadata-only logging estimates as well as inference; credits are shared across eligible services, not reserved for AI.
- Owner-selected maximum cash spend, application token/request ceilings and budget-exhaustion behavior. Do not assume willingness to pay beyond credits.
- One small synthetic invocation, measured token use and latency, schema/citation behavior, and billing confirmation when authorized implementation begins.
- Model comparison on the same two subject fixtures: supported answers, source grounding, ambiguous questions, rubric uncertainty, practical-task suitability, latency and estimated cost per usable pack.

Until these pass, run fake-provider development and label any demonstration accordingly. Local tests must not require a paid model call.

## Cost planning

Do not use a historical advertised model rate as a current quote. Pin rates only after the exact model, Region and inference mode are selected. The dynamic pricing page did not yield a reliable numeric Nova quote during this research, so no numeric per-token rate is asserted here.

```text
inference cost = (input tokens × input rate per million
                + output tokens × output rate per million) / 1,000,000
projected total = inference + explicit retries/evaluations + stateless endpoint
                + static web delivery + metadata-only logging
```

Include provider-reported additional billable token categories where applicable. Sum concept extraction, activity generation, repairs and per-answer rubric grading; a pack is not necessarily one model call. Measure on representative selected sections rather than assuming a whole 50-page source fits cheaply.

Initial planning allocation, as a fraction of verified usable budget (not an instruction to spend it): 50% inference/evaluation, 20% hosting/storage/operations, 30% reserve. Adjust after measurements. If only $100 is actually available, budget against $100, not the advertised maximum.

Reuse locally stored validated packs per source revision/selection/prompt/model/schema version. Generate 3–5 questions, bound context/output and concurrency, and allow at most one next-pack pre-generation request and one unused prefetched pack. Save answer drafts before explicit grading; do not auto-replay dropped requests. A stateless endpoint cannot guarantee exactly-once billing or enforce a durable global dollar ledger. Enforce server-side per-request token/time limits and deployment-level rate/concurrency controls, keep an operator disable switch, and monitor measured usage. Browser budgets can guide prefetch but are not trusted spend controls. Billing alerts are visibility tools, not a hard cap; validate the account's spending controls before public use.

When access, quotas or budget fail, retain prepared activities and progress, return a clear recoverable reason, and offer existing packs. Never substitute fabricated live output or silently switch to an unapproved paid provider. OpenAI credits are not required by this plan.
