import { expect, test } from "@playwright/test";

const spaceId = "11111111-1111-4111-8111-111111111111",
  documentId = "22222222-2222-4222-8222-222222222222";
const source = {
  id: `${documentId}:1:0`,
  location: 1,
  start: 0,
  end: 12,
  text: "Plants grow.",
};
const concepts = {
  schemaVersion: 1,
  status: "ready",
  requestId: "33333333-3333-4333-8333-333333333333",
  location: 1,
  error: null,
  provider: "fake",
  relations: [],
  concepts: ["Light", "Growth"].map((label, index) => ({
    id: `${index + 4}4444444-4444-4444-8444-444444444444`,
    title: label,
    label,
    description: `${label} concept`,
    selected: true,
    sources: [source],
  })),
};
const empty = {
  schemaVersion: 1,
  status: "empty",
  requestId: null,
  packId: null,
  provider: "fake",
  error: null,
  questions: [],
};
const ready = {
  ...empty,
  status: "ready",
  requestId: "66666666-6666-4666-8666-666666666666",
  packId: "77777777-7777-4777-8777-777777777777",
  questions: [
    {
      id: "88888888-8888-4888-8888-888888888888",
      type: "recall",
      conceptIds: concepts.concepts.map((item) => item.id),
      prompt: "Recall how plants grow.",
      estimatedMinutes: 2,
      sources: [source],
    },
  ],
};

test("prepares an ID-only learner-safe pack, reloads it and opens exact evidence", async ({
  page,
}) => {
  let state: typeof empty | typeof ready = empty,
    body: Record<string, unknown> = {};
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
  await page.route(`**/api/study-spaces/${spaceId}/activity-pack`, (route) =>
    route.fulfill({ json: state }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/activity-pack/generate`,
    async (route) => {
      body = route.request().postDataJSON();
      state = ready;
      await route.fulfill({ json: ready });
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  await page.getByRole("button", { name: "Prepare activity pack" }).click();
  expect(Object.keys(body).sort()).toEqual(["requestId", "schemaVersion"]);
  expect(JSON.stringify(body)).not.toContain("source");
  await expect(
    page.getByRole("list", { name: "Saved activity pack" }),
  ).toContainText("Recall how plants grow.");
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
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(
    page.getByRole("list", { name: "Saved activity pack" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Open source section 1/ })
    .last()
    .click();
  await expect(page.locator("mark")).toHaveText(source.text);
  await expect(page.locator(".source-text")).toBeFocused();
});
