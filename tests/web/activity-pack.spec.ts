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
      review: { supportedAnswer: "Plants need light and water." },
    },
    {
      id: "99999999-9999-4999-8999-999999999999",
      type: "mcq",
      conceptIds: concepts.concepts.map((item) => item.id),
      prompt: "What helps plants grow?",
      estimatedMinutes: 1,
      sources: [source],
      options: [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", text: "Light" },
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", text: "Stone" },
        { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", text: "Metal" },
      ],
      review: {
        correctOptionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        answerExplanation: "The material says plants use light.",
      },
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
  await page.route(`**/api/study-spaces/${spaceId}/activity-pack`, (route) =>
    route.fulfill({ json: ready }),
  );
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
  await page.getByRole("button", { name: "Preview material" }).click();
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
  await page.getByRole("button", { name: "Preview material" }).click();
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
  await page.getByRole("button", { name: "Flag ambiguous" }).first().click();
  await expect(page.getByText(/Flagged as ambiguous/)).toBeVisible();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByText(/Flagged as ambiguous/)).toBeVisible();
});
