# Agent development workflow

TAI uses four development roles, coordinated by the primary agent. These agents help build the software; they are not runtime agents inside the learning product.

## Roles

| Role | Responsibility | Output |
| --- | --- | --- |
| `principal_engineer` | Break down requirements, assess architecture and contracts, resolve technical tradeoffs | Bounded plan, acceptance criteria, dependencies, file ownership, risks |
| `coder` | Implement assigned behavior and fix findings | Changed files, behavior summary, verification evidence |
| `reviewer` | Independently inspect the diff and surrounding code without edits | Prioritized findings with locations, triggers, impact, and suggested fixes |
| `tester` | Independently verify acceptance criteria and reproduce failures | Commands, results, failure reproductions, skipped checks; tests when assigned |

Definitions live in [principal_engineer.toml](../../.codex/agents/principal_engineer.toml), [coder.toml](../../.codex/agents/coder.toml), [reviewer.toml](../../.codex/agents/reviewer.toml), and [tester.toml](../../.codex/agents/tester.toml). Each follows the root AGENTS.md and inherits the session's model and permissions. Reviewer read-only behavior is an instruction, not an additional sandbox guarantee.

## Workflow

1. The coordinator identifies the requested outcome and relevant PRD requirements. Use the principal engineer for substantial features, architectural decisions, and ambiguous boundaries.
2. Assign the coder a bounded task with explicit file ownership and acceptance criteria. The coder implements and performs relevant local verification.
3. Have the reviewer and tester independently assess the same identified revision or working-tree snapshot. Run them in parallel when their work is independent.
4. Send concrete findings to the coder. Recheck affected behavior after fixes; evidence for an earlier revision does not automatically apply to new edits.
5. The coordinator inspects the combined result, resolves remaining findings, runs necessary integration checks, and reports completion or remaining limitations.

For trivial edits, use only the roles that add value. Do not launch four agents just to fill roles. Respect the runtime's concurrency limit; roles may run in phases. The primary agent may carry out planning and integration directly.

## Task and handoff contract

Each assignment states:

- objective and PRD acceptance criteria;
- relevant files, current revision or diff scope, and dependencies;
- files the agent may edit, or that the task is read-only;
- expected output and applicable verification;
- known constraints and unresolved decisions.

Each result states what changed or was inspected, evidence with file references, exact checks and outcomes, and remaining failures or omissions. Label blocking defects separately from suggestions. Do not invent tests, audits, or approvals.

## Shared workspace rules

One writer owns a file at a time, including tests, documentation, schemas, and lockfiles. The coordinator must reassign ownership or sequence edits before another agent changes that file. Tester-written tests need explicit ownership; production fixes normally return to the coder.

Do not overwrite others' work or perform Git operations while another agent is changing the same working tree. A reviewer who authors a fix needs another independent reviewer for that fix. Agents report conflicts to the coordinator rather than silently reverting changes.

The coordinator owns integration and any user-authorized commit, push, merge, or deployment. Subagents do not spawn further agents or perform those actions unless explicitly assigned within the user's authorization.

## Additional specialties

Keep the team at four core roles for now. Assign focused security/privacy review for ownership and deletion changes, accessibility review for learner interfaces, and learning-content audits for generated questions and rubrics. Add a permanent specialist only when repeated work justifies it.

## Configuration and use

The files use the standalone custom-agent TOML format documented in [OpenAI's subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). A compatible local Codex client discovers project agents in `.codex/agents/`.

Example request:

> Implement FR-01 using the TAI agent workflow. Have the principal engineer define a bounded plan, the coder implement it, and the reviewer and tester independently check the result. Fix blocking findings and summarize the verification.

The CLI installed when these files were added reported `codex-cli 0.48.0`. TOML and role consistency can be validated locally, but custom-agent discovery has not been verified on that installed client. Use a client supporting the documented format for automatic discovery. In environments with delegation tools but no named-role loading, the coordinator can explicitly pass the matching file's instructions to a subagent. If delegation is unavailable, report that limitation and perform the roles sequentially without claiming independent subagent review.
