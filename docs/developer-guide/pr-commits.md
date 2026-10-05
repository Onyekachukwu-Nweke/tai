# Pull requests and commits

Use commits to explain why tai changed and pull requests to show the resulting behavior and verification.

## Commit messages

Use Conventional Commit-style subjects:

```text
feat(activities): add source-linked recall questions
fix(progress): avoid duplicate attempts on retry
security(storage): enforce study-space ownership
docs: update developer guide
test(review): cover hinted-answer scheduling
```

Common types are `feat`, `fix`, `security`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, and `chore`. Write concise imperative subjects without a trailing period. Explain motivation and tradeoffs in the body when needed. Mark breaking contracts with `!` and a `BREAKING CHANGE:` footer.

Keep each commit coherent. Never commit credentials, private learner documents, raw learner answers, or sensitive logs. Claim verification only for checks actually run against the relevant code.

## Pull-request scope

Address one primary outcome. Keep dependent schema, implementation, fixture, and documentation changes together; separate unrelated cleanup. Link the relevant PRD requirement or issue.

Every changed human- or AI-written software code file must satisfy the [350-line rule](code-hygiene.md#file-size-and-responsibility). Split by responsibility rather than compressing formatting.

## Description

Lead with the problem and the resulting behavior. For small changes, a short explanation and verification are sufficient. Use this structure when more detail helps:

```markdown
## Summary

What problem does this solve, and what happens now?
Which PRD requirement or issue does it address?

## Verification

Commands run and results; relevant manual checks.
Checks not run and why.

## Compatibility and data

Affected schemas, saved packs, source references, ownership, or deletion.
Migration and recovery notes, when applicable.

## UI evidence

Screenshots or a walkthrough for meaningful visual or interaction changes.
```

Omit inapplicable sections. Describe remaining limitations honestly and distinguish follow-up improvements from acceptance criteria still unmet.

## Evidence and merging

Include evidence appropriate to the change: deterministic scheduling tests, source-reference validation, duplicate-save checks, offline reloads, deletion checks, or accessibility walkthroughs. Generated-content changes need content review as well as schema checks.

Applicable configured checks must pass. Resolve blocking feedback and request another review after material changes. Use the repository's configured merge strategy; for squash merges, make the final title a suitable commit subject and preserve important verification context in the description.
