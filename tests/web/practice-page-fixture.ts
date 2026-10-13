import type { Page } from "@playwright/test";
import { routeRecoveryOffer } from "./study-session-fixture";
import {
  concepts,
  documentId,
  ready,
  source,
  spaceId,
  studySession,
} from "./activity-pack-fixture";

const json = (body: unknown) => ({ json: body });

/** Routes a practice page with a saved two-question pack and an active session. */
export async function routePracticePage(page: Page) {
  const attempts: Array<Record<string, unknown>> = [];
  await page.route("**/api/session", (route) =>
    route.fulfill(
      json({
        schemaVersion: 1,
        user: { id: "learner", name: "Learner", email: "l@example.test" },
      }),
    ),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill(
      json({
        schemaVersion: 1,
        spaces: [
          { id: spaceId, title: "Biology", createdAt: "2026-10-08T00:00:00Z" },
        ],
      }),
    ),
  );
  const space = `**/api/study-spaces/${spaceId}`;
  await page.route(`${space}/material`, (route) =>
    route.fulfill(
      json({
        schemaVersion: 1,
        material: {
          schemaVersion: 1,
          documentId,
          filename: "source.txt",
          format: "txt",
          warnings: [],
          sections: [{ location: 1, text: source.text }],
          chunks: [{ ...source, documentId }],
        },
      }),
    ),
  );
  await page.route(`${space}/concepts`, (route) =>
    route.fulfill(json(concepts)),
  );
  await page.route(`${space}/concept-progress`, (route) =>
    route.fulfill(
      json({
        schemaVersion: 1,
        asOf: "2026-10-09T00:00:00.000Z",
        policy: "heuristic",
        disclosure: "Review timing is a simple study heuristic.",
        concepts: concepts.concepts.map((item) => ({
          conceptId: item.id,
          conceptLabel: item.label,
          label: "Not checked",
          reviewStep: 0,
          lastCheckedAt: null,
          nextReviewAt: null,
        })),
      }),
    ),
  );
  await page.route(`${space}/activity-pack`, (route) =>
    route.fulfill(json(ready)),
  );
  await page.route(`${space}/study-session`, (route) =>
    route.fulfill(json(studySession)),
  );
  await page.route(`${space}/activity-tutor?packId=*`, (route) =>
    route.fulfill(
      json({ schemaVersion: 1, packId: ready.packId, interactions: [] }),
    ),
  );
  await page.route(`${space}/activity-attempts?packId=*`, (route) =>
    route.fulfill(
      json({ schemaVersion: 1, packId: ready.packId, attempts: [], flags: [] }),
    ),
  );
  await page.route(`${space}/activity-attempts`, (route) => {
    const input = route.request().postDataJSON();
    attempts.push(input);
    const question = ready.questions.find(
      (item) => item.id === input.questionId,
    );
    return route.fulfill({
      status: 201,
      json: {
        schemaVersion: 1,
        attemptId: input.attemptId,
        interaction: input.interaction,
        correctness: null,
        selfAssessment: input.selfAssessment ?? null,
        confidence: input.confidence,
        revealed: true,
        skipped: input.interaction === "skip",
        hintUsed: false,
        alternateExplanationUsed: false,
        numericResult: null,
        excludedFromScoring: false,
        flagReason: null,
        feedback: "Saved.",
        supportedByMaterial: true,
        answer:
          question?.type === "recall" ? question.review.supportedAnswer : null,
        correctOptionId: null,
      },
    });
  });
  await page.route(`${space}/practical-task`, (route) =>
    route.fulfill(
      json({
        schemaVersion: 1,
        status: "empty",
        requestId: null,
        reason: null,
        error: null,
        task: null,
      }),
    ),
  );
  await routeRecoveryOffer(page, spaceId, { offered: false });
  return { attempts };
}
