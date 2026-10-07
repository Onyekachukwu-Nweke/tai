# M0 browser extraction evidence — 7 October 2026

Scope: browser-only extraction and preview on `feat/material-extraction-preview`, based on merged main `4887436`. This implements part of M0.3 and FR-01; M0 and M1 exit gates remain incomplete.

## Behavior

Signed-in learners can preview one local PDF/TXT file in a study space. Files and extracted text stay in tab memory. There is no upload, server persistence, AI call, or automatic external-link fetching. Closing the preview, switching spaces, signing out, or reloading clears it.

Validation enforces 10,000,000 bytes, 50 PDF pages, supported extensions and bytes, UTF-8 decoding, and rejection of binary controls. Defensive extracted-text limits are 500,000 UTF-16 characters and 500 chunks. Source chunks retain document IDs, page/section locations, and offsets into normalized extracted text. Explicit retry retains the document ID; selecting a file anew starts a new preview revision.

PDF.js 6.4.299 and its worker are bundled locally and lazy-loaded for PDF selection. This version has removed the earlier `isEvalSupported` option; the installed display/worker builds do not use the former dynamic-evaluation path. The separate PDF scripting sandbox is not imported. Parser resources are released on success, failure, and cancellation. Late results are discarded.

A failed replacement preserves the previous preview. Text is rendered literally through React, one page/section at a time, with a 20,000-character display cap and notice. Learners are warned to compare equations, symbols, tables, and reading order with the original.

## Fixtures and verification

Fixtures contain synthetic text only. Reproduce them with `node scripts/generate-material-fixtures.mjs`; the generator is subject to the authored-code line limit. Fixtures cover two pages, 50/51 pages, blank/mixed pages, a quantitative plain-text page, malformed data, and an encryption-dictionary rejection case. The password fixture is a synthetic rejection envelope, not a valid encrypted-document audit.

`npm run check` passed on the final implementation: formatting, ESLint, TypeScript, 38 authored code files within 350 lines, 71 local Markdown file links, 19 unit/Worker tests, 23 Chromium browser tests, the Vite production build, and Wrangler dry-run bundling. `git diff --check` passed. Verification used Node 24.21.0/npm 11.21.0 and approved local socket access; no remote deployment was performed.

The 23 browser tests include 16 extraction scenarios and the seven foundation regressions. The PDF case confirms a local worker asset request and only same-origin GET requests. The quantitative fixture extracted `F = m a; 2 kg x 3 m/s^2 = 6 N` with the fidelity warning visible. PDF text is read in batches with a character cap before concatenation.

The dependency installation audit reported zero vulnerabilities. Browser tests use mocked authentication/study-space responses but real browser file reads and real PDF.js parsing. No learner documents are used.

Independent review found no blocking issues, including the final streaming reader cleanup, cancellation checks, and cumulative character limit.

## Remaining gates

No low-end Android test, real complex mathematical-layout fidelity audit, provider stream, live AI quality/cost evaluation, remote R2/D1 provisioning, or completed live OAuth walkthrough is claimed. The quantitative fixture tests literal text extraction only; it does not establish superscript, fraction, diagram, or table fidelity. Language detection is not implemented; the UI discloses English-only scope.

M1 must add server revalidation, owner-scoped original/chunk persistence as one material revision, reopening originals, and deletion. This preview never claims material has been saved.
