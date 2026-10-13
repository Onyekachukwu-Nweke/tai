# M4.4 accessibility and language evidence

**Scope:** local text sizing, English-only guidance and simpler-English tutor help  
**Date:** 13 October 2026

## Implemented behavior

- Signed-in learners can choose Standard (100%), Large (112.5%) or Largest
  (125%) text in a labelled Settings card. The validated preference is applied
  before React renders and survives reload in local browser storage. Corrupt or
  unavailable storage falls back to Standard; a failed save leaves the selected
  size active for the current tab and reports the limitation.
- Settings and material upload guidance state that TAI supports English only and
  does not detect or translate other languages. The recovery guidance asks the
  learner to use a trusted English translation and compare terminology, symbols,
  numbers and units with the original.
- The existing `explain_again` action is labelled **Explain in simpler English**.
  Its API kind, quota behavior, persistence and source-linked response contract
  are unchanged. Workers AI prompt provenance advances to `activity-tutor-v2`.
  The prompt requires shorter sentences while preserving exact terminology,
  symbols, numbers, units and course conventions; it forbids added facts and
  analogies or examples so the response remains wholly source-grounded.

## Automated evidence

Focused unit tests cover preference validation and unavailable storage, prompt
requirements, hidden-answer exclusion, provenance and deterministic fake output.
Focused Chromium tests cover keyboard-labelled selection, focus, persistence
after reload, corrupt storage, English-only disclosure, and Largest-text reflow
and 44 px setting controls at 320 px and 360 px widths.

The exact commands and results are recorded in the pull request. Repository
formatting, lint, TypeScript, authored-file length and local-link checks must pass
before merge.

## Open evidence

Automated Chromium viewport checks are not a representative-device audit. Manual
screen-reader, browser zoom, high-contrast/forced-colors, multiple real mobile
devices and the complete learner journey at every text size remain to be run.
Live Workers AI output still needs content review to confirm that simpler-English
responses preserve terminology and course conventions and do not introduce new
material. No language detection, translation or non-English generation is
implemented or claimed.
