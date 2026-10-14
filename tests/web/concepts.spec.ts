import { openFirstStudySpace } from "./shell-navigation";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const spaceId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const conceptId = "33333333-3333-4333-8333-333333333333";
const chunkId = `${documentId}:1:0`;
const excerpt = "Plants grow.";
const text = `${excerpt} ${excerpt}`;
const empty = {
  schemaVersion: 1,
  status: "empty",
  requestId: null,
  scope: null,
  concepts: [],
  relations: [],
  error: null,
  provider: "fake",
};
const ready = {
  schemaVersion: 1,
  status: "ready",
  requestId: "44444444-4444-4444-8444-444444444444",
  scope: { startLocation: 1, endLocation: 1 },
  concepts: [
    {
      id: conceptId,
      title: "Photosynthesis",
      label: "Photosynthesis",
      description: "Plants use light energy.",
      selected: true,
      sources: [
        {
          id: chunkId,
          location: 1,
          start: excerpt.length + 1,
          end: text.length,
          text: excerpt,
        },
      ],
    },
  ],
  relations: [],
  error: null,
  provider: "fake",
};

async function open(page: Page, format: "txt" | "pdf" = "txt") {
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
          filename: `source.${format}`,
          format,
          warnings: [],
          sections: [{ location: 1, text }],
          chunks: [
            {
              id: chunkId,
              documentId,
              location: 1,
              start: 0,
              end: text.length,
              text,
            },
          ],
        },
      },
    }),
  );
  await page.goto("/");
  await openFirstStudySpace(page);
}

test("generates from IDs, saves edits and shows the exact cited TXT evidence", async ({
  page,
}) => {
  test.setTimeout(15_000);
  let state: typeof empty | typeof ready = empty;
  let generationBody: Record<string, unknown> = {};
  await page.route(`**/api/study-spaces/${spaceId}/concepts`, (route) =>
    route.fulfill({ json: state }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/concepts/generate`,
    async (route) => {
      generationBody = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      state = ready;
      await route.fulfill({ json: ready });
    },
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/concepts/${conceptId}`,
    async (route) => {
      const update = route.request().postDataJSON();
      state = {
        ...ready,
        concepts: [
          {
            ...ready.concepts[0],
            label: update.label ?? ready.concepts[0].label,
            selected: update.selected ?? ready.concepts[0].selected,
          },
        ],
      };
      await route.fulfill({ json: state });
    },
  );
  await open(page);
  await page.getByRole("button", { name: "Generate concepts" }).click();
  expect(Object.keys(generationBody).sort()).toEqual([
    "requestId",
    "schemaVersion",
    "selection",
  ]);
  expect(generationBody.selection).toEqual({
    startLocation: 1,
    endLocation: 1,
  });
  expect(generationBody).not.toHaveProperty("text");
  await expect(
    page.getByRole("list", { name: "List of concepts" }),
  ).toContainText("Photosynthesis");
  await expect(page.getByText("Learn by doing")).toHaveCount(0);
  await expect(page.getByText("Today’s session")).toHaveCount(0);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const map = page.getByRole("list", { name: "Map of concepts" });
  await expect(map).toContainText("Photosynthesis");
  await map.getByRole("button", { name: /Photosynthesis/ }).click();
  await expect(
    page.getByRole("complementary", { name: "Cited passage" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: /Edit/ }).first().click();
  await page.getByLabel("Concept label").fill("Plant energy");
  await page.getByRole("button", { name: "Save label" }).click();
  await expect(page.getByLabel("Include Plant energy")).toBeVisible();
  await page.getByRole("button", { name: "Open source page 1" }).click();
  const cited = page.getByRole("complementary", { name: "Cited passage" });
  await expect(cited).toBeFocused();
  await expect(cited).toContainText("Cited from section 1");
  await expect(cited.locator("mark")).toHaveText(excerpt);
  await page.keyboard.press("Escape");
  await expect(cited).toHaveCount(0);
});

test("a PDF citation explicitly opens the matching rendered page", async ({
  page,
}) => {
  const pdf = await readFile(resolve("tests/fixtures/materials/two-page.pdf"));
  await page.route(`**/api/study-spaces/${spaceId}/concepts`, (route) =>
    route.fulfill({ json: ready }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/material/original`,
    (route) => route.fulfill({ body: pdf, contentType: "application/pdf" }),
  );
  await open(page, "pdf");
  await page.getByRole("button", { name: "Open source page 1" }).click();
  await expect(page.getByLabel("Rendered PDF page 1")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("complementary", { name: "Cited passage" }).locator("mark"),
  ).toHaveText(excerpt);
});

test("keeps each concept selection control aligned at desktop and mobile widths", async ({
  page,
}) => {
  await page.route(`**/api/study-spaces/${spaceId}/concepts`, (route) =>
    route.fulfill({ json: ready }),
  );
  await open(page);
  const control = page.getByLabel("Include Photosynthesis");
  const label = page
    .getByRole("listitem")
    .filter({ has: control })
    .locator("strong");

  for (const viewport of [
    { width: 1000, height: 800 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(control).toBeVisible();
    const controlBox = await control.boundingBox();
    const labelBox = await label.boundingBox();
    expect(controlBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    expect(controlBox!.width).toBeLessThanOrEqual(24);
    expect(controlBox!.height).toBeLessThanOrEqual(24);
    expect(
      Math.abs(
        controlBox!.y +
          controlBox!.height / 2 -
          (labelBox!.y + labelBox!.height / 2),
      ),
    ).toBeLessThanOrEqual(2);
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(viewport.width);
  }
});
