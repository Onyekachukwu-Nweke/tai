export const browserSource = (documentId: string) => ({
  id: `${documentId}:1:0`,
  location: 1,
  start: 0,
  end: 12,
  text: "Plants grow.",
});

export function activeStudySession(
  packId: string,
  questions: Array<{ id: string; estimatedMinutes: number }>,
) {
  return {
    schemaVersion: 1,
    status: "active",
    sessionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    packId,
    budgetMinutes: 5,
    estimatedMinutes: questions.reduce(
      (total, question) => total + question.estimatedMinutes,
      0,
    ),
    mode: "learn",
    kind: "standard",
    conceptId: null,
    items: questions.map((question, position) => ({
      questionId: question.id,
      position,
      estimatedMinutes: question.estimatedMinutes,
      reason: "You asked to learn from your current material.",
      completedAt: null,
    })),
    createdAt: "2026-10-09T00:00:00.000Z",
    completedAt: null,
  };
}

export const emptyActivityPack = {
  schemaVersion: 1,
  status: "empty",
  requestId: null,
  packId: null,
  provider: "fake",
  error: null,
  questions: [],
} as const;

export const routeRecoveryOffer = (
  page: Page,
  spaceId: string,
  offer: Record<string, unknown>,
) =>
  page.route(`**/api/study-spaces/${spaceId}/recovery-offer`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        inactiveSince: null,
        thresholdDays: 3,
        budgetMinutes: 10,
        canResume: false,
        activeSession: null,
        ...offer,
      },
    }),
  );
import type { Page } from "@playwright/test";
