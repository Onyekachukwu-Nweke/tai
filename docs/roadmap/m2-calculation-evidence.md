# M2 calculation activity evidence

Status: **in progress**. This bounded fake-provider slice does not complete M2 or FR-03.

TAI now creates one calculation activity only when its deterministic provider finds the exact synthetic quantitative statement that a cart travels 120 metres in 10 seconds and that speed equals distance divided by time. The reviewed fixture key is independently asserted as 12 m/s. Other material does not receive a calculation, so this slice does not claim general quantitative extraction or model-generated key quality.

The pack stores cited givens, bounded LaTeX notation, a worked explanation, a reasoning rubric, a numeric key, inclusive absolute and relative tolerances, and an allow-listed unit policy. The browser performs an instant pure numeric check and the Worker repeats the same check before saving. Input accepts exactly one finite decimal or scientific-notation number followed by one unit. Conversions are limited to the fixed registry; symbolic algebra and expression evaluation are absent.

Final-number correctness and working feedback remain separate. A calculation attempt saves the final answer, working, numeric outcome, confidence and assistance flags idempotently. The fake rubric provider grades only the working and deliberately returns `uncertain`; targeted follow-up may address that working-rubric gap. Calculation evidence remains neutral for concept review scheduling.

KaTeX renders notation with `trust: false`, strict errors, bounded expansion and size, and both visual HTML and accessible MathML. Trusted URL/HTML commands and oversized or invalid expressions fall back to literal code text.

Automated coverage checks exact and tolerance-boundary answers, equivalent and unsupported units, missing units, malformed and non-finite values, Worker replay and re-checking, progress neutrality, mixed correct-number/uncertain-working outcomes, and safe-math fallback. Migration `0012` adds calculation fields while preserving existing attempts and JSON compatibility.

Still open are live-provider generation and grading, a reviewed quantitative-document audit, per-user AI quota enforcement, extraction-quality gating for arbitrary equations, symbolic answers, and measured deployed rendering/performance. This evidence establishes deterministic behavior for one synthetic permitted fixture only.
