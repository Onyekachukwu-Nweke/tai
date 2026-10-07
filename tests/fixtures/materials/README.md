# Synthetic material fixtures

Regenerate with `node scripts/generate-material-fixtures.mjs` from the repository root. All material is synthetic, ASCII, and non-sensitive. PDF byte offsets and stream lengths are generated deterministically; no external fixture source is used.

- `two-page.pdf`: two text pages for page/source association.
- `fifty-pages.pdf`, `fifty-one-pages.pdf`: page-limit boundary cases.
- `blank.pdf`: one page without text; this exercises textless handling but is not a scanned-image extraction audit.
- `mixed.pdf`: a text page and a blank page.
- `equation.pdf`: simple ASCII notation only. This does not establish reliable extraction of real mathematical fonts, tables, or complex layouts.
- `password.pdf`: synthetic encryption dictionary with an intentionally unavailable password verifier. It exercises encrypted-envelope rejection, not successful decryption or a broad real-world encrypted-PDF audit.
- `malformed.pdf`: invalid document with a PDF header.
- `notes.txt`: short UTF-8 text.
