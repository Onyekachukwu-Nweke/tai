import { openFirstSpacePractice } from "./shell-navigation";
import { expect, test, type Page } from "@playwright/test";
import {
  concepts as baseConcepts,
  documentId,
  empty as emptyPack,
  source,
  spaceId,
} from "./activity-pack-fixture";

const emptyTask = {
  schemaVersion: 1,
  status: "empty",
  requestId: null,
  reason: null,
  error: null,
  task: null,
} as const;
const variant = (minutes: number) => ({
  modality: "written_analysis",
  objective: "Demonstrate how plants use light.",
  instructions: ["Write one source-backed example."],
  expectedOutput: "A short written example.",
  requiredTools: ["paper", "pen"],
  estimatedMinutes: minutes,
  selfCheck: ["The example matches the cited source."],
  connectivity: {
    requirement: "none",
    disclosure: "No internet connection is needed.",
  },
  cost: { kind: "none" },
});
const task = {
  schemaVersion: 1,
  suitable: true,
  reason: "A safe written task is supported.",
  conceptIds: [baseConcepts.concepts[0]!.id],
  sourceIds: [source.id],
  task: variant(15),
  simpler: variant(5),
  freeAlternative: variant(10),
  id: "99999999-9999-4999-8999-999999999999",
  completed: false,
  completedAt: null,
};
const ready = (completed = false) => ({
  schemaVersion: 1,
  status: "ready",
  requestId: "88888888-8888-4888-8888-888888888888",
  reason: task.reason,
  error: null,
  task: {
    ...task,
    completed,
    completedAt: completed ? "2026-10-11T10:00:00.000Z" : null,
  },
});

async function routePage(page: Page) {
  let concepts = structuredClone(baseConcepts),
    state: ReturnType<typeof ready> | typeof emptyTask = emptyTask;
  let generateCalls = 0,
    completionCalls = 0;
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
  for (const concept of baseConcepts.concepts)
    await page.route(
      `**/api/study-spaces/${spaceId}/concepts/${concept.id}`,
      async (route) => {
        const update = route.request().postDataJSON();
        concepts = {
          ...concepts,
          concepts: concepts.concepts.map((item) =>
            item.id === concept.id
              ? { ...item, selected: update.selected ?? item.selected }
              : item,
          ),
        };
        await route.fulfill({ json: concepts });
      },
    );
  await page.route(`**/api/study-spaces/${spaceId}/activity-pack`, (route) =>
    route.fulfill({ json: emptyPack }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/concept-progress`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        asOf: "2026-10-11T10:00:00.000Z",
        policy: "heuristic",
        disclosure:
          "Review timing is a simple study heuristic, not a validated prediction of memory.",
        concepts: [],
      },
    }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/study-session`, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        status: "empty",
        sessionId: null,
        packId: null,
        budgetMinutes: null,
        estimatedMinutes: 0,
        mode: null,
        kind: null,
        conceptId: null,
        items: [],
        createdAt: null,
        completedAt: null,
      },
    }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/practical-task`, (route) =>
    route.fulfill({ json: state }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/practical-task/generate`,
    async (route) => {
      generateCalls += 1;
      state = ready();
      await route.fulfill({ json: state });
    },
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/practical-task/${task.id}/completion`,
    async (route) => {
      completionCalls += 1;
      const completed = Boolean(route.request().postDataJSON().completed);
      if (completionCalls === 1) return route.abort("failed");
      state = ready(completed);
      await route.fulfill({ json: state });
    },
  );
  return {
    generateCalls: () => generateCalls,
    completionCalls: () => completionCalls,
  };
}

test("prepares, inspects and persists a practical task accessibly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const observed = await routePage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  const prepare = page.getByRole("button", { name: "Prepare practical task" });
  const picker = page.getByLabel("Concept for this task");
  await expect(picker.locator("option")).toHaveCount(2);
  await picker.selectOption({ label: baseConcepts.concepts[0]!.label });
  await expect(page.getByLabel(/^Include /)).toHaveCount(0);
  await expect(prepare).toBeEnabled();
  await prepare.press("Enter");
  await expect(page.getByText("paper, pen")).toBeVisible();
  await expect(page.getByText(/none: No internet connection/)).toBeVisible();
  await expect(page.getByText("No cost.")).toBeVisible();
  expect(observed.generateCalls()).toBe(1);
  await page.getByRole("button", { name: "Simpler task" }).click();
  await expect(page.getByText("5 minutes")).toBeVisible();
  await page.getByRole("button", { name: "No-cost alternative" }).click();
  await expect(page.getByText("10 minutes")).toBeVisible();
  expect(observed.generateCalls()).toBe(1);
  await page.getByRole("button", { name: "Open source page 1" }).last().click();
  await expect(page.locator("mark")).toHaveText(source.text);
  await page.getByRole("button", { name: "Mark task complete" }).click();
  await expect(page.getByText("Completed by you")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry saving completion" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry saving completion" }).click();
  expect(observed.completionCalls()).toBe(2);
  await page.reload();
  await openFirstSpacePractice(page);
  await expect(page.getByText("Completed by you")).toBeVisible();
  await page.getByRole("button", { name: "Undo completion" }).click();
  await expect(page.getByText("Completed by you")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await expect(
    page.getByRole("button", { name: "Prepare another task" }),
  ).toHaveJSProperty("tagName", "BUTTON");
});
