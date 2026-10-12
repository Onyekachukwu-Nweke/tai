# M4.2 checked resource catalog evidence

**Scope:** FR-09 supplementary-resource matching on `feat/resource-catalog`.

TAI matches each currently selected, owner-scoped concept against a small
compile-time catalog. Matching requires a complete normalized word or keyphrase;
it does not use AI, fuzzy matching, learner documents, or external requests.
Concepts without a suitable checked match are returned explicitly.

## Catalog review

These HTTPS pages were opened and reviewed on **12 October 2026**:

| Coverage | Resource | Publisher | Access observed |
| --- | --- | --- | --- |
| Project management | [Project management: the start of the project journey](https://www.open.edu/openlearn/money-business/leadership-management/project-management-the-start-the-project-journey/content-section-overview) | The Open University — OpenLearn | Content starts without sign-up; an optional free account adds progress and participation features. |
| Critical analysis | [How to be a critical reader](https://www.open.edu/openlearn/languages/english-language/how-be-critical-reader) | The Open University — OpenLearn | Free course content; a free account is requested for enrolment and progress features. |
| Statistical reasoning | [What Is Statistics: Crash Course Statistics #1](https://www.youtube.com/watch?v=sxQaBpKfDRk) | CrashCourse | Free YouTube video; advertisements may appear and sign-in features are optional. TAI links to it without embedding or autoplay. |
| Statistics | [Introductory Statistics 2e](https://openstax.org/details/books/introductory-statistics-2e) | OpenStax | Free web textbook and download; optional services may require an account. |
| Algebra | [Algebra and Trigonometry 2e](https://openstax.org/details/books/algebra-and-trigonometry-2e) | OpenStax | Free web textbook and download; optional services may require an account. |
| Programming | [JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) | MDN Web Docs | Free to read without an account. |

Every recommendation includes its title, publisher, HTTPS URL, supported
concept, language, format, access conditions, review date and relevance reason.
The learner sees this metadata before choosing a clearly announced new-tab
link. Links use `noopener`, `noreferrer` and a no-referrer policy. TAI does not
embed, preload, autoplay, automatically navigate to, or fetch these resources.

## Boundaries and verification

The catalog does not claim subject-wide discovery. Availability and publisher
terms can change after the review date, so links need periodic rechecking. The
resource is supplementary and does not replace or verify uploaded material. No
recommendation, click or external-site activity is persisted.

Automated coverage checks schema validation, complete-keyphrase matching,
false-positive avoidance, explicit no-match behavior, authentication,
cross-user isolation, selected-concept filtering, metadata rendering and safe
link attributes. Final command results are recorded in the pull request.
