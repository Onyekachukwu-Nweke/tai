import { openFirstSpacePractice } from "./shell-navigation";
import { expect, test } from "@playwright/test";
import { routeRecoveryOffer } from "./study-session-fixture";
import {
  concepts,
  documentId,
  ready,
  source,
  spaceId,
  studySession,
} from "./activity-pack-fixture";

test("keeps an unacknowledged draft for explicit retry and hides review keys in storage", async ({
  page,
}) => {
  let failures = 1;
  let acknowledged: Record<string, unknown> | null = null;
  let savedFlag: "incorrect" | "ambiguous" | null = null;
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
            id: spaceId,
            title: "Biology",
            createdAt: "2026-10-08T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/material`, (route) =>
    route.fulfill({
      json: {
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
      },
    }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/concepts`, (route) =>
    route.fulfill({ json: concepts }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/concept-progress`, (route) =>
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
  await page.route(`**/api/study-spaces/${spaceId}/activity-pack`, (route) =>
    route.fulfill({ json: ready }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/study-session`, (route) =>
    route.fulfill({ json: studySession }),
  );
  await routeRecoveryOffer(page, spaceId, { offered: false });
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-attempts`,
    async (route) => {
      if (failures--)
        return route.fulfill({
          status: 503,
          json: { error: "Save interrupted." },
        });
      const input = route.request().postDataJSON();
      acknowledged = {
        schemaVersion: 1,
        attemptId: input.attemptId,
        interaction: input.interaction,
        correctness: null,
        selfAssessment: input.selfAssessment ?? null,
        confidence: input.confidence,
        revealed: true,
        skipped: false,
        hintUsed: false,
        alternateExplanationUsed: false,
        numericResult: null,
        excludedFromScoring: false,
        flagReason: null,
        feedback: "Saved.",
        supportedByMaterial: true,
        answer: ready.questions[0].review.supportedAnswer,
        correctOptionId: null,
      };
      return route.fulfill({
        status: 201,
        json: acknowledged,
      });
    },
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-attempts?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: ready.packId,
          attempts: acknowledged
            ? [{ questionId: ready.questions[0].id, result: acknowledged }]
            : [],
          flags: savedFlag
            ? [{ questionId: ready.questions[0].id, reason: savedFlag }]
            : [],
        },
      }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-flags`,
    async (route) => {
      savedFlag = route.request().postDataJSON().reason;
      await route.fulfill({
        status: 201,
        json: { questionId: ready.questions[0].id, reason: savedFlag },
      });
    },
  );
  await page.goto("/");
  await openFirstSpacePractice(page);
  await page.getByLabel("Your response").first().fill("Light supports growth");
  await page.getByLabel("Confidence (optional)").first().selectOption("high");
  await page
    .getByRole("button", { name: "Check against supported answer" })
    .click();
  await page.getByRole("button", { name: "Partial" }).click();
  await expect(page.getByText(/Save interrupted.*draft remains/)).toBeVisible();
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  expect(stored).toContain("Light supports growth");
  expect(stored).not.toContain("Plants need light and water");
  expect(stored).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.reload();
  await openFirstSpacePractice(page);
  await expect(page.getByLabel("Your response").first()).toHaveValue(
    "Light supports growth",
  );
  await page
    .getByRole("button", { name: "Check against supported answer" })
    .click();
  await page.getByRole("button", { name: "Partial" }).click();
  await expect(
    page.getByText("No scored correctness result.").first(),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Light supports growth",
  );
  await page.getByLabel("Flag reason").first().selectOption("ambiguous");
  await page.getByRole("button", { name: /Flag/ }).first().click();
  await expect(page.getByText(/Flagged as ambiguous/)).toBeVisible();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await openFirstSpacePractice(page);
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByText(/Flagged as ambiguous/)).toBeVisible();
});
