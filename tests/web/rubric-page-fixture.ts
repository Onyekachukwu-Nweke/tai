import type { Page } from "@playwright/test";
import {
  activeStudySession,
  routeRecoveryOffer,
} from "./study-session-fixture";

export const rubricIds = {
  space: "11111111-1111-4111-8111-111111111111",
  document: "22222222-2222-4222-8222-222222222222",
  pack: "77777777-7777-4777-8777-777777777777",
  question: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};
const source = {
  id: `${rubricIds.document}:1:0`,
  location: 1,
  start: 0,
  end: 32,
  text: "Light supplies energy to plants.",
};
const question = {
  id: rubricIds.question,
  type: "explain" as const,
  conceptIds: ["44444444-4444-4444-8444-444444444444"],
  prompt: "Explain how light supports growth.",
  estimatedMinutes: 3,
  sources: [source],
};
const pack = {
  schemaVersion: 1,
  status: "ready",
  requestId: "66666666-6666-4666-8666-666666666666",
  packId: rubricIds.pack,
  provider: "fake",
  error: null,
  questions: [question],
};

export async function routeRubricPage(page: Page) {
  let attempt: Record<string, unknown> | null = null;
  let grade: Record<string, unknown> | null = null;
  let failures = 1;
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        user: { id: "learner", name: "Learner", email: "learner@example.test" },
      },
    }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        spaces: [
          {
            id: rubricIds.space,
            title: "Biology",
            createdAt: "2026-10-09T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route(`**/api/study-spaces/${rubricIds.space}/material`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        material: {
          schemaVersion: 1,
          documentId: rubricIds.document,
          filename: "source.txt",
          format: "txt",
          warnings: [],
          sections: [{ location: 1, text: source.text }],
          chunks: [{ ...source, documentId: rubricIds.document }],
        },
      },
    }),
  );
  await page.route(`**/api/study-spaces/${rubricIds.space}/concepts`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        status: "ready",
        requestId: "33333333-3333-4333-8333-333333333333",
        location: 1,
        error: null,
        provider: "fake",
        relations: [],
        concepts: [
          {
            id: question.conceptIds[0],
            title: "Light",
            label: "Light",
            description: "Light concept",
            selected: true,
            sources: [source],
          },
        ],
      },
    }),
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/concept-progress`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          asOf: "2026-10-09T00:00:00.000Z",
          policy: "heuristic",
          disclosure: "Review timing is a study heuristic.",
          concepts: [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/activity-pack`,
    (route) => route.fulfill({ json: pack }),
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/study-session`,
    (route) =>
      route.fulfill({ json: activeStudySession(rubricIds.pack, [question]) }),
  );
  await routeRecoveryOffer(page, rubricIds.space, { offered: false });
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/activity-tutor?packId=*`,
    (route) =>
      route.fulfill({
        json: { schemaVersion: 1, packId: rubricIds.pack, interactions: [] },
      }),
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/activity-attempts?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: rubricIds.pack,
          attempts: attempt
            ? [{ questionId: rubricIds.question, result: attempt }]
            : [],
          flags: [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/activity-rubric?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: rubricIds.pack,
          grades: grade ? [grade] : [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/activity-attempts`,
    async (route) => {
      const input = route.request().postDataJSON();
      attempt = {
        schemaVersion: 1,
        attemptId: input.attemptId,
        interaction: "explain_submit",
        correctness: null,
        selfAssessment: null,
        confidence: input.confidence,
        revealed: false,
        skipped: false,
        hintUsed: false,
        alternateExplanationUsed: false,
        excludedFromScoring: false,
        flagReason: null,
        feedback: "Your explanation was saved before grading.",
        supportedByMaterial: false,
        answer: null,
        correctOptionId: null,
      };
      await route.fulfill({ status: 201, json: attempt });
    },
  );
  await page.route(
    `**/api/study-spaces/${rubricIds.space}/activity-rubric`,
    async (route) => {
      if (failures--)
        return route.fulfill({
          status: 503,
          json: { error: "Grading interrupted." },
        });
      const input = route.request().postDataJSON();
      grade = {
        schemaVersion: 1,
        requestId: input.requestId,
        attemptId: input.attemptId,
        packId: rubricIds.pack,
        questionId: rubricIds.question,
        outcome: "partial",
        feedback: "Add the role described in the cited source.",
        elements: [
          {
            criterion: "Connect light to growth",
            outcome: "partial",
            feedback: "The connection needs one more detail.",
          },
        ],
        sources: [source],
      };
      await route.fulfill({ status: 201, json: grade });
    },
  );
}
