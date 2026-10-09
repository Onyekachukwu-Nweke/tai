import type { Page } from "@playwright/test";
import {
  activeStudySession,
  routeRecoveryOffer,
} from "./study-session-fixture";

export const calculationIds = {
  space: "11111111-1111-4111-8111-111111111111",
  document: "22222222-2222-4222-8222-222222222222",
  pack: "77777777-7777-4777-8777-777777777777",
  question: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
};
const text =
  "A cart travels 120 metres in 10 seconds. Speed equals distance divided by time.";
const source = {
  id: `${calculationIds.document}:1:0`,
  location: 1,
  start: 0,
  end: text.length,
  text,
};
const conceptId = "44444444-4444-4444-8444-444444444444";
const question = {
  id: calculationIds.question,
  type: "calculation" as const,
  conceptIds: [conceptId],
  prompt: "Calculate the cart's speed.",
  notation: String.raw`v = \frac{d}{t}`,
  givens: ["Distance d = 120 m", "Time t = 10 s"],
  estimatedMinutes: 4,
  sources: [source],
  review: {
    unitPolicy: "required" as const,
    expectedValue: 12,
    expectedUnit: "m/s" as const,
    allowedUnits: ["m/s" as const, "km/h" as const],
    absoluteTolerance: 0.01,
    relativeTolerance: 0.001,
  },
};
const pack = {
  schemaVersion: 1,
  status: "ready",
  requestId: "66666666-6666-4666-8666-666666666666",
  packId: calculationIds.pack,
  provider: "fake",
  error: null,
  questions: [question],
};

export async function routeCalculationPage(page: Page) {
  let attempt: Record<string, unknown> | null = null;
  let grade: Record<string, unknown> | null = null;
  let saves = 0;
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
            id: calculationIds.space,
            title: "Physics",
            createdAt: "2026-10-09T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/material`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          material: {
            schemaVersion: 1,
            documentId: calculationIds.document,
            filename: "motion.txt",
            format: "txt",
            warnings: [],
            sections: [{ location: 1, text }],
            chunks: [{ ...source, documentId: calculationIds.document }],
          },
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/concepts`,
    (route) =>
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
              id: conceptId,
              title: "Speed",
              label: "Speed",
              description: "Speed calculation",
              selected: true,
              sources: [source],
            },
          ],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/concept-progress`,
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
    `**/api/study-spaces/${calculationIds.space}/activity-pack`,
    (route) => route.fulfill({ json: pack }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/study-session`,
    (route) =>
      route.fulfill({
        json: activeStudySession(calculationIds.pack, [question]),
      }),
  );
  await routeRecoveryOffer(page, calculationIds.space, { offered: false });
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/activity-tutor?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: calculationIds.pack,
          interactions: [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/activity-followup?packId=*`,
    (route) =>
      route.fulfill({
        json: { schemaVersion: 1, packId: calculationIds.pack, followups: [] },
      }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/activity-attempts?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: calculationIds.pack,
          attempts: attempt
            ? [{ questionId: calculationIds.question, result: attempt }]
            : [],
          flags: [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/activity-rubric?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: calculationIds.pack,
          grades: grade ? [grade] : [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/activity-attempts`,
    async (route) => {
      saves += 1;
      const input = route.request().postDataJSON();
      attempt = calculationAttempt(input.attemptId, input.confidence);
      await route.fulfill({ status: 201, json: attempt });
    },
  );
  await page.route(
    `**/api/study-spaces/${calculationIds.space}/activity-rubric`,
    async (route) => {
      const input = route.request().postDataJSON();
      grade = calculationGrade(input.requestId, input.attemptId);
      await route.fulfill({ status: 201, json: grade });
    },
  );
  return { saves: () => saves };
}

function calculationAttempt(attemptId: string, confidence: string | null) {
  return {
    schemaVersion: 1,
    attemptId,
    interaction: "calculation_submit",
    correctness: "correct",
    numericResult: {
      outcome: "correct",
      submittedValue: 43.2,
      submittedUnit: "km/h",
      convertedValue: 12.000000000000002,
      tolerance: 0.012,
    },
    selfAssessment: null,
    confidence,
    revealed: false,
    skipped: false,
    hintUsed: false,
    alternateExplanationUsed: false,
    excludedFromScoring: false,
    flagReason: null,
    feedback:
      "The final number and unit are within tolerance. Working saved separately.",
    supportedByMaterial: false,
    answer: "Divide 120 m by 10 s to obtain 12 m/s.",
    correctOptionId: null,
  };
}

function calculationGrade(requestId: string, attemptId: string) {
  return {
    schemaVersion: 1,
    requestId,
    attemptId,
    packId: calculationIds.pack,
    questionId: calculationIds.question,
    outcome: "uncertain",
    feedback:
      "The number is correct; this fake provider cannot judge the working.",
    elements: [
      {
        criterion: "Uses speed equals distance divided by time.",
        outcome: "uncertain",
        feedback: "Review the working against the cited section.",
      },
    ],
    sources: [source],
  };
}
