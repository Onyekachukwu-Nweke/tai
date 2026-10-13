import {
  exitFocusForSessionSettings,
  openFirstSpacePractice,
  resumePracticeSession,
} from "./shell-navigation";
import { expect, test } from "@playwright/test";
import { routeRecoveryOffer } from "./study-session-fixture";
import {
  concepts,
  documentId,
  empty,
  ready,
  restoredHint,
  source,
  spaceId,
  studySession,
} from "./activity-pack-fixture";

test("prepares an ID-only learner-safe pack, reloads it and opens exact evidence", async ({
  page,
}) => {
  let state: typeof empty | typeof ready = empty,
    body: Record<string, unknown> = {};
  let currentSession = studySession;
  let releaseTutor!: () => void;
  const tutorGate = new Promise<void>((resolve) => (releaseTutor = resolve));
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
        disclosure:
          "Review timing is a simple study heuristic, not a validated prediction of memory.",
        concepts: concepts.concepts.map((item) => ({
          conceptId: item.id,
          conceptLabel: item.label,
          label: "Not checked",
          reviewStep: 0,
          lastCheckedAt: null,
          nextReviewAt: null,
        })),
      },
    }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/activity-pack`, (route) =>
    route.fulfill({ json: state }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/study-session`,
    async (route) => {
      if (route.request().method() === "POST")
        currentSession = {
          ...currentSession,
          sessionId: "13131313-1313-4313-8313-131313131313",
        };
      await route.fulfill({ json: currentSession });
    },
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-tutor?packId=*`,
    async (route) => {
      await tutorGate;
      await route.fulfill({
        json: {
          schemaVersion: 1,
          packId: ready.packId,
          interactions: [restoredHint],
        },
      });
    },
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-tutor`,
    async (route) => {
      const request = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          ...restoredHint,
          requestId: request.requestId,
          kind: request.kind,
          text: "Saved alternate explanation.",
        },
      });
    },
  );
  await routeRecoveryOffer(page, spaceId, { offered: false });
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-pack/generate`,
    async (route) => {
      body = route.request().postDataJSON();
      state = ready;
      await route.fulfill({ json: ready });
    },
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-attempts?packId=*`,
    (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          packId: ready.packId,
          attempts: [],
          flags: [],
        },
      }),
  );
  await page.goto("/");
  await openFirstSpacePractice(page);
  await page.getByRole("button", { name: "Prepare activity pack" }).click();
  await resumePracticeSession(page);
  expect(Object.keys(body).sort()).toEqual(["requestId", "schemaVersion"]);
  expect(JSON.stringify(body)).not.toContain("source");
  await expect(
    page.getByRole("list", { name: "Saved activity pack" }),
  ).toContainText("Recall how plants grow.");
  releaseTutor();
  await expect(page.getByText(restoredHint.text)).toBeVisible();
  await page
    .getByRole("button", { name: "Explain in simpler English" })
    .first()
    .click();
  await expect(page.getByText("Saved alternate explanation.")).toBeVisible();
  await exitFocusForSessionSettings(page);
  await page
    .getByRole("button", { name: "Replace with these settings" })
    .click();
  await expect(page.getByText(restoredHint.text)).toBeVisible();
  await expect(page.getByText("Saved alternate explanation.")).toBeVisible();
  const html = await page
    .getByRole("list", { name: "Saved activity pack" })
    .textContent();
  for (const key of [
    "supportedAnswer",
    "correctOptionId",
    "rubric",
    "answerExplanation",
  ])
    expect(html).not.toContain(key);
  await page.reload();
  await openFirstSpacePractice(page);
  await expect(
    page.getByRole("button", { name: "Not reviewed" }).first(),
  ).toBeVisible();
  await page.getByText("How review status works").click();
  await expect(
    page.getByText(/not a validated prediction of memory/),
  ).toBeVisible();
  await resumePracticeSession(page);
  await expect(
    page.getByRole("list", { name: "Saved activity pack" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open source page 1" }).last().click();
  await expect(page.locator("mark")).toHaveText(source.text);
  await expect(
    page.getByRole("complementary", { name: "Cited passage" }),
  ).toBeFocused();
});
