# Git branching

Use short-lived, focused branches for tai. Keep `main` usable and merge feature work through pull requests.

## Branch names

Use lowercase kebab-case with a category prefix:

```text
feat/source-linked-activities
fix/interrupted-progress-save
security/local-space-isolation
docs/developer-guide
refactor/review-scheduling
test/upload-validation
chore/configure-linting
```

Include an issue number when useful, for example `fix/42-interrupted-progress-save`. Avoid vague names such as `updates`.

## Lifecycle

1. Branch from an up-to-date `main`.
2. Keep commits focused on one coherent outcome.
3. Open a draft pull request when early feedback is useful.
4. Incorporate relevant changes from `main` before final review. Coordinate before rewriting shared history.
5. Run applicable checks and resolve review feedback.
6. Merge using the repository's selected strategy and delete the completed branch when no longer needed.

Prefer small working increments over long-running integration branches. Keep unfinished behavior inaccessible until it is usable.

## Repository protection

When configuring hosting, protect `main` against force pushes and deletion, require applicable checks, and use pull-request review where a reviewer is available. These are intended settings, not a claim that protections or CI already exist.

Give local source isolation, deletion, credential handling, and schema changes particular review attention. Document any expedited merge and deferred verification so it can be followed up.

## Demo and release references

Record the exact commit used for a demo or release. If using release tags, keep them immutable. Record relevant model, prompt, and schema versions when evaluating generated content so results can be interpreted later. Keep environment differences in validated configuration rather than separate code branches.
