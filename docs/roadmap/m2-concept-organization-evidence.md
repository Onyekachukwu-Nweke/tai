# M2.1 concept organization evidence

Status: **in progress**. This slice does not complete M2 or FR-02.

## Implemented

- An explicit learner action requests concepts for a page range: the whole document by default, or one chapter when the PDF has top-level bookmarks. The browser sends a request UUID and start/end page only; the Worker resolves the owner and loads current chunks from D1.
- Chapters come only from the PDF's own outline, read locally during extraction and saved with the material (`outline_json`). Text is not scanned for headings. TXT files, PDFs without bookmarks and materials saved before this change use the whole document.
- The Worker bounds model context to 16 chunks and 24,000 characters. Pages under 200 characters (cover, contents or near-blank pages) are skipped unless the whole range is thin, and chunks are sampled evenly across the remaining pages in reading order. Prompt version `concept-organization-v2` names the page range and each excerpt's page.
- Provider drafts have a strict bounded schema. Source IDs and relation indexes are validated against loaded context before persistence. The Worker assigns stable UUID concept IDs.
- Request state, citations, editable labels, selection, and suggested relations persist in D1 and cascade with the material. Replaying the same successful request ID avoids another provider call.
- Writes require the same active space, ready material revision and pending request. Deletion or a material change prevents a late result from creating concepts.
- List and map modes expose the same concepts. Suggested connections do not disable selection. Citations focus the exact extracted chunk; PDF citations explicitly open the private reader on the cited page.
- Provider failure and page ranges without usable text show an explicit limitation and retry path. Provider exception details and source text are not returned in errors or logged.

## Current limitation

The configured provider is deterministic and fake. The product discloses that its output is unreviewed and unsuitable as evidence of educational quality. It makes no external or billed request. Live-provider access, quotas, model comparison, prompt review, content audit and measured 5–15 concept quality remain open.

Automated coverage targets contracts, source associations, owner isolation, server-side context loading, UUID persistence, replay, edits, failed-regeneration preservation, request content types, origins, missing evidence and deletion during generation. Browser coverage targets the ID-only request, list/map parity, saved edits, offset-exact TXT evidence focus including duplicate text, and PDF citation rendering.

On 8 October 2026, `npm run check` passed formatting, lint, TypeScript, 74 authored-file length checks, 75 local documentation links, 9 maintenance/parser tests, 43 Worker/contract tests, 39 Chromium tests, the Vite production build and the Wrangler dry-run build. `npx wrangler d1 migrations apply DB --local` applied `0003_concepts.sql` successfully. No remote environment or live model was exercised.
