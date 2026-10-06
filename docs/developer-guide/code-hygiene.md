# Code hygiene

tai handles learner material, generated activities, and learning progress. Keep code readable, responsibilities explicit, and data handling predictable.

## File size and responsibility

**Human- and AI-written software code files must not exceed 350 physical lines.** This is a hard limit, including blank lines, comments, imports, and declarations. It applies to production code, tests, migrations, build scripts, and executable development scripts.

Machine-generated code, such as output from a schema compiler or generation script, is exempt. An AI agent writing source code does not make that code a generated artifact. Identify generated files and document their source and reproducible generation command; edit the source rather than the output. Human- or AI-written generators remain subject to the limit.

Documentation, non-executable configuration, data, lockfiles, and vendored third-party code are outside the software-code limit. Do not move executable logic into configuration, compress formatting, or label maintained code as generated to evade it.

Split files by cohesive responsibility before they exceed the limit. Keep extraction, generation, validation, persistence, scheduling, and presentation separate where their responsibilities differ. Avoid numbered fragments, catch-all utility modules, and files that mix unrelated concerns even below 350 lines.

## Readability and contracts

- Use names that describe learner concepts and application behavior.
- Keep functions focused, with visible inputs, outputs, and side effects.
- Use explicit types and validated schemas at external boundaries.
- Use stable IDs for study spaces, materials, source chunks, concepts, activities, and attempts.
- Make clocks, network clients, and AI adapters replaceable for deterministic tests.
- Return structured errors with useful recovery guidance and no sensitive payloads.
- Explain non-obvious constraints in comments; remove dead code and comments that repeat the implementation.
- Follow repository-selected formatters, linters, and type checks once configured. Do not suppress checks broadly to land a change.

## Trust boundaries and AI output

Treat documents, model responses, and external resource metadata as untrusted data. Uploaded content must never become application instructions.

- Validate file formats and configurable size/page limits in the browser before extraction. The Worker revalidates original-file inputs before private R2 storage, loads source chunks from D1 for ID-based AI requests, and validates answer lengths and response schemas at its boundary.
- Validate generated response schemas and cited source IDs before saving activities.
- Sanitize content before rendering and avoid automatically fetching URLs from uploaded text.
- Keep credentials server-side. Every Worker route resolves the signed-in user and scopes D1 queries and R2 keys by that user ID; a study-space ID never authorizes access.
- Keep review scheduling, session budgeting, exact multiple-choice grading, and numeric tolerance/unit checks against reviewed keys in deterministic application code. Validate finite numeric values and permitted units explicitly; never use raw `eval` for generated mathematics. Render LaTeX through safely configured KaTeX, with untrusted HTML commands disabled.
- Bound explicit retries and preserve a usable state when extraction or generation fails. Do not replay requests automatically when connectivity returns.

## Persistence and retries

D1 is the canonical store for extracted content, packs, attempts and progress; R2 holds original files. Keep an unsent answer in the browser until the server acknowledges it, and save submitted progress before showing completion. Prevent retries or duplicate submissions from creating duplicate attempts or unnecessary repeated AI calls. Preserve the learner's answer when saving fails.

Do not hold storage transactions open during AI or network calls. Use explicit processing states and persist the information needed to recover interrupted work. Version persisted schemas and invalidate activities whose source evidence is no longer valid. Surface quota errors without claiming a failed write was saved. Deletion removes local dependent records, cancels related work where possible, and makes late responses ineligible for persistence. There is no server deletion queue or synchronization outbox.

Use self-contained JSON packs of 3–5 questions with answers or rubrics, explanations, and supporting source excerpts. Validate complete streamed items before exposing them; partial JSON is never an activity. Permit at most one bounded next-pack prefetch while the learner studies, with no automatic reconnect retry.

## Dependencies and sensitive data

Add dependencies for a demonstrated need. Record supported runtime versions and use the chosen ecosystem's lockfiles. Keep the AI adapter replaceable and avoid infrastructure unnecessary for the demo.

Never commit credentials or private learner material. Do not log raw documents or answers by default. Use stable identifiers and bounded diagnostic fields; redact secrets before logging. Retain source files until learner deletion and remove dependent application-controlled data when deleting a study space.

## Before review

Run available formatting, static checks, and relevant tests. Inspect the diff for secrets, debug output, unrelated changes, and generated noise. Check every changed authored code file against the 350-line limit and update documentation when behavior or contracts change.
