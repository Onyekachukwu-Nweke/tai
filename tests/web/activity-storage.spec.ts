import { expect, test } from "@playwright/test";
import { activeStudySession } from "./study-session-fixture";

const space = "11111111-1111-4111-8111-111111111111";
const pack = "77777777-7777-4777-8777-777777777777";
const question = "88888888-8888-4888-8888-888888888888";
const documentId = "22222222-2222-4222-8222-222222222222";
test("keeps the in-memory draft when browser storage rejects writes", async ({
  page,
}) => {
  const sessionBodies: Array<Record<string, unknown>> = [];
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked");
    };
  });
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
            id: space,
            title: "Biology",
            createdAt: "2026-10-08T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  const source = {
    id: `${documentId}:1:0`,
    location: 1,
    start: 0,
    end: 12,
    text: "Plants grow.",
  };
  await page.route(`**/api/study-spaces/${space}/material`, (route) =>
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
  await page.route(`**/api/study-spaces/${space}/concepts`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        status: "ready",
        requestId: "33333333-3333-4333-8333-333333333333",
        location: 1,
        error: null,
        provider: "fake",
        relations: [],
        concepts: ["4", "5"].map((n) => ({
          id: `${n}4444444-4444-4444-8444-444444444444`,
          title: n,
          label: n,
          description: n,
          selected: true,
          sources: [source],
        })),
      },
    }),
  );
  await page.route(`**/api/study-spaces/${space}/concept-progress`, (route) =>
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
  await page.route(`**/api/study-spaces/${space}/activity-pack`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        status: "ready",
        requestId: "66666666-6666-4666-8666-666666666666",
        packId: pack,
        provider: "fake",
        error: null,
        questions: [
          {
            id: question,
            type: "recall",
            conceptIds: ["44444444-4444-4444-8444-444444444444"],
            prompt: "Recall growth.",
            estimatedMinutes: 2,
            sources: [source],
            review: { supportedAnswer: "Plants grow." },
          },
        ],
      },
    }),
  );
  const active = activeStudySession(pack, [
    { id: question, estimatedMinutes: 2 },
  ]);
  await page.route(
    `**/api/study-spaces/${space}/study-session`,
    async (route) => {
      if (route.request().method() === "POST") {
        sessionBodies.push(route.request().postDataJSON());
        if (sessionBodies.length === 1) {
          await route.abort("failed");
          return;
        }
        await route.fulfill({
          json:
            sessionBodies.length === 2
              ? {
                  ...active,
                  status: "completed",
                  completedAt: "2026-10-09T00:05:00.000Z",
                }
              : active,
        });
        return;
      }
      await route.fulfill({ json: active });
    },
  );
  await page.route(
    `**/api/study-spaces/${space}/activity-attempts?packId=*`,
    (route) =>
      route.fulfill({
        json: { schemaVersion: 1, packId: pack, attempts: [], flags: [] },
      }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  const answer = page.getByLabel("Your response");
  await answer.fill("Still held in memory");
  await expect(answer).toHaveValue("Still held in memory");
  await expect(
    page.getByText(/could not persist your draft/).first(),
  ).toBeVisible();
  await page.getByLabel("Time available").selectOption("30");
  await page.getByLabel("What would you like to do?").selectOption("review");
  await page
    .getByLabel("Concept (optional)")
    .selectOption("54444444-4444-4444-8444-444444444444");
  await page
    .getByRole("button", { name: "Replace with these settings" })
    .click();
  await expect(page.getByText("Failed to fetch")).toBeVisible();
  await page
    .getByRole("button", { name: "Replace with these settings" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Session saved" }),
  ).toBeVisible();
  await expect(page.getByLabel("Time available")).toBeVisible();
  expect(sessionBodies[1]).toMatchObject({
    budgetMinutes: 30,
    mode: "review",
    conceptId: "54444444-4444-4444-8444-444444444444",
    replaceActive: true,
  });
  expect(sessionBodies[1]?.sessionId).toBe(sessionBodies[0]?.sessionId);
  await page.getByRole("button", { name: "Prepare today’s session" }).click();
  expect(sessionBodies[2]?.replaceActive).toBe(false);
  expect(sessionBodies[2]?.sessionId).not.toBe(sessionBodies[1]?.sessionId);
});
