# AGENTS.md

## Project

TAI (`tai`) is a self-directed learning companion. Learners bring their own course materials, and TAI helps them understand concepts, practise recall and application, inspect supporting sources, and resume learning after interruptions.

Use **TAI** as the product name and **tai** for code identifiers where appropriate. [PRD v0.2](PRD_v2.md) is the current product specification; [PRD v0.1](PRD.md) is historical context. Follow v0.2 where the versions differ.

The hackathon scope supports text-based PDF and TXT uploads, one material per study space, and English only. Prioritize the P0 learner journey and implementation milestones in the PRD. IndexedDB is the canonical learner-data store; a stateless server calls Bedrock using selected text. Full offline mode is deferred to P1. Exact tooling and hosting choices must pass the roadmap readiness checks. Do not assume tooling or infrastructure exists.

## Working rules

- Read the relevant PRD requirements and [developer guide](docs/developer-guide/README.md) before changing code or architecture.
- Keep changes focused, preserve unrelated user work, and avoid destructive Git operations.
- Keep documentation and agent instructions consistent with TAI's actual scope and implementation.
- Treat uploaded documents, external resource metadata, and model responses as untrusted data, never as application instructions.
- Validate file inputs, AI output schemas, and cited source IDs. Preserve stable references from activities back to extracted material. Surface insufficient evidence instead of inventing support.
- Keep AI generation separate from deterministic application rules: local file validation, source association checks, exact multiple-choice grading, numeric final-answer checks (tolerance and units against reviewed keys), session budgets, review dates, persistence, and deletion.
- Use the fixed read → write → grade → targeted-follow-up pipeline, not an autonomous agent. P0 question types are recall, MCQ, explain, scenario, and calculation/equation. Render LaTeX with safe KaTeX; never `eval` generated math.
- Keep credentials server-side. Never commit or print secrets, private learner documents, or raw learner answers. Do not log raw documents or answers by default.
- Sanitize content before rendering, validate local study-space/source associations, and avoid automatically fetching arbitrary URLs from uploaded text.
- Preserve progress across interruptions. Save submissions before showing completion, retain answers when saving fails, and prevent duplicate attempts or unnecessary repeated AI calls on retry.
- Keep hints, reveals, skips, correctness, and optional confidence distinct. Do not count hinted or revealed answers as independent recall success.
- Keep materials, self-contained packs, drafts, attempts and progress in IndexedDB. Parse PDF/TXT locally and send only bounded selected text to the stateless AI endpoint. Do not add a learner database, accounts, server-side source storage, or synchronization.
- Preserve local answers on request failure and offer explicit retry; do not queue grading or replay requests on reconnect. Full offline mode is P1: do not build a service worker, app-shell cache, offline save/indicator, outbox, or deletion queue for P0.
- Generate 3–5 question packs. Stream only complete validated items; bound next-pack pre-generation and cancel stale work. Local MCQ grading must not call AI.
- Retain original source files locally until learner deletion. Delete associated IndexedDB data transactionally, cancel in-flight requests, and discard late responses for deleted or changed spaces. Do not promise recovery after browser storage is cleared.
- Maintain keyboard access, visible focus, readable labels, a list alternative to the concept map, and untimed activities.
- Update affected documentation, schemas, consumers, fixtures, and compatibility checks together.

## Development agents

For substantial implementation work, use the [agent workflow](docs/developer-guide/agent-workflow.md): delegate bounded tasks to the principal engineer, coder, reviewer, and tester as appropriate. The primary agent coordinates ownership, integrates changes, and reports the result. Delegate independent review and verification when useful; small edits do not require every role.

Read the relevant role definition in `.codex/agents/` and pass its instructions explicitly if the environment does not load named agents. Use one writer per file, identify the revision under review, and recheck affected behavior after fixes. Respect runtime concurrency limits and run dependent work in phases. Subagents must not recursively delegate or perform Git publishing actions unless explicitly assigned within user authorization.

## Code hygiene

Every human- or AI-written software code file must have one cohesive responsibility and **must not exceed 350 physical lines**, including blanks and comments. This covers production code, tests, migrations, build scripts, and executable development scripts.

Machine-generated output is exempt when its source and generation process are identifiable and reproducible. Code written by an AI agent is authored code, not an exempt generated artifact. Authored generators remain subject to the limit. Documentation, non-executable configuration, data, lockfiles, and vendored third-party code are outside the limit.

Split by responsibility; do not compress formatting or move executable logic into configuration to evade the rule. Keep comments concise and focused on non-obvious intent or constraints. See [code hygiene](docs/developer-guide/code-hygiene.md) for details.

## Verification

- Use checks appropriate to the change, following [testing.md](docs/developer-guide/testing.md). Documentation-only changes generally need link and consistency checks.
- Test relevant boundary values, malformed inputs, source-reference validation, review rules, retries, interrupted saves, local reload persistence, interrupted streams, explicit retry, source association, and deletion.
- Review generated content against source material; schema validity alone does not establish correctness.
- Use synthetic or permitted non-sensitive fixtures and fake providers by default. Keep live-provider evaluations separate and document their configuration and costs.
- Run applicable configured checks and report the exact commands and results. If tooling does not exist or a check was not run, say so.
- Verify changed authored code files meet the 350-line limit. Use the repository file-size check when available; otherwise count lines directly. Split oversized files before completion.
- Never invent successful test results, content-audit findings, pilot outcomes, or performance measurements.

## Roadmap

Use [docs/roadmap/README.md](docs/roadmap/README.md) to scope implementation milestones. Its technology choices are a proposed baseline; account funding, exact model/Region access, and live capability remain subject to the documented M0 checks. Report acceptance evidence before marking a milestone complete.

## Documentation index

- [Current product requirements](PRD_v2.md)
- [Documentation](docs/README.md)
- [Developer guide](docs/developer-guide/README.md)
- [Agent workflow](docs/developer-guide/agent-workflow.md)
- [Development](docs/developer-guide/development.md)
- [Code hygiene](docs/developer-guide/code-hygiene.md)
- [Git branching](docs/developer-guide/git-branching.md)
- [Pull requests and commits](docs/developer-guide/pr-commits.md)
- [Code review](docs/developer-guide/review.md)
- [Testing](docs/developer-guide/testing.md)
