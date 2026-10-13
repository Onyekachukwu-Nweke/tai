# Live Workers AI evaluation

**Status:** one bounded live comparison ran on 13 October 2026. Both models were rejected by manual content review, so no model is selected.

The evaluator compares the production concept and activity-pack adapters against exactly two Workers AI models. It makes four sequential calls: concepts and one activity pack for each model. It uses only the checked-in synthetic speed and project-risk fixture. It does not read `.env`, learner material, or saved answers.

## Safety boundary

The command refuses to start unless both controls have their exact values:

```text
TAI_LIVE_EVAL_ENABLED=I_ACCEPT_LIVE_AI_COST
AI_CALLS_ENABLED=true
```

It also requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `AI_GATEWAY_ID` in the process environment. `TAI_LIVE_EVAL_MODELS` may contain exactly two distinct comma-separated `@cf/` model IDs. When omitted, the candidates are:

```text
@cf/meta/llama-3.3-70b-instruct-fp8-fast
@cf/meta/llama-3.1-8b-instruct-fast
```

The tool has a hard four-call cap, executes calls sequentially, does not retry or fall back, and uses a 30-second request timeout. It asks AI Gateway to bypass cache, disable per-request log collection, and make at most one attempt. Normal `npm test` never invokes the live entry point.

The operator must export the variables into the command's environment before running:

```bash
npm run eval:live-ai
```

Do not paste credentials into arguments, documentation, reports, or terminal transcripts. The tool deliberately does not load `.env`; use the workstation's normal secret-loading method.

## Report and manual review

Collision-safe reports and separate review artifacts are written with enforced owner-only file permissions under ignored `artifacts/live-evaluation/`. The metrics report contains the gateway ID, model/task/provider and prompt/schema versions, fixture/source IDs, latency, HTTP status, categorized failures, schema and source-ID validity, and validated item counts/types. A schema-valid task is labelled `validated_pending_review`, never usable, until a person completes the audit.

The review artifact contains only validated generated concepts and questions needed to inspect prompts, options, rubrics, explanations, relationships and cited IDs. It has a pending-review warning. Both artifacts omit credentials, account identifiers, authorization headers, request bodies and fixture source text; neither contains an unvalidated or full raw model response.

Provider-reported numeric usage is recorded when present. Missing usage stays `null` with a reason. Cost stays `null` unless Cloudflare directly reports it; the evaluator does not estimate tokens or cost from unverified rates. A valid schema does not establish educational quality. A human must compare the owner-only review artifact with the checked-in synthetic fixture for source fidelity, usefulness and ambiguity before choosing a model, then record the review outcome separately.

Unavailable models and rejected outputs remain recorded failures. If only one candidate is accessible, the comparison is blocked rather than treated as a winner. Calculation generation remains excluded from the production activity-pack adapter, so this run does not validate generated numeric keys.

## Offline verification

The focused tests use injected fake transports and make no network requests. They cover refusal before fetch, the call cap and privacy headers, timeout/model-unavailable classification, nullable and present usage, report redaction, and production-adapter rejection of malformed JSON and invented source IDs.

## 13 October 2026 result

The authorized run made four sequential requests through gateway `tai`; all
returned HTTP 200 and passed the v1 production schema and source-ID checks.
Cloudflare reported the following measurements:

| Model | Task | Latency | Prompt / completion tokens | Neurons | Validated output |
| --- | --- | ---: | ---: | ---: | --- |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | concepts | 5,923 ms | 167 / 109 | 26.7773 | 2 concepts |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | pack | 19,526 ms | 246 / 634 | 136.4068 | 5 explain questions |
| `@cf/meta/llama-3.1-8b-instruct-fast` | concepts | 2,943 ms | 167 / 360 | 13.2402 | 6 concepts |
| `@cf/meta/llama-3.1-8b-instruct-fast` | pack | 4,809 ms | 246 / 551 | 20.2253 | 3 recall questions |

Cloudflare did not report a dollar cost, so actual and estimated cost remain
unknown. The four calls consumed 196.6496 reported neurons in total.

Manual review rejected both models. The 70B pack used only explain questions
and included weak or unsupported real-world framing. The 8B pack used only
recall questions, introduced unsupported timeline and probability details, and
produced overly granular concepts plus relations that did not follow from the
sources. Schema validity and known citation IDs did not establish educational
quality.

The review led to `activity-pack-v2`: deterministic validation now requires at
least two question types, while the prompt explicitly forbids facts,
quantities, events, and scenario details absent from the excerpts. No second
paid run has been made, so model selection and live v2 quality remain open.
