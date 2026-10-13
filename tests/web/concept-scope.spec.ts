import { expect, test, type Page } from "@playwright/test";
import { openFirstStudySpace } from "./shell-navigation";

const spaceId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const texts = [
  "Course notes",
  "Contents",
  "Cells",
  "Cells",
  "Energy",
  "Energy",
];
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

async function open(page: Page, outline?: object[]) {
  const selections: unknown[] = [];
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        user: { id: "learner", name: "Learner", email: "l@example.test" },
      },
    }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        spaces: [
          { id: spaceId, title: "Biology", createdAt: "2026-10-08T00:00:00Z" },
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
          filename: "notes.pdf",
          format: "pdf",
          warnings: [],
          sections: texts.map((text, index) => ({ location: index + 1, text })),
          chunks: texts.map((text, index) => ({
            id: `${documentId}:${index + 1}:0`,
            documentId,
            location: index + 1,
            start: 0,
            end: text.length,
            text,
          })),
          ...(outline ? { outline } : {}),
        },
      },
    }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/material/original`, (r) =>
    r.abort(),
  );
  await page.route(`**/api/study-spaces/${spaceId}/concepts`, (route) =>
    route.fulfill({ json: empty }),
  );
  await page.route(
    `**/api/study-spaces/${spaceId}/concepts/generate`,
    async (route) => {
      selections.push(route.request().postDataJSON().selection);
      await route.fulfill({
        status: 503,
        json: { error: "Not in this test." },
      });
    },
  );
  await page.goto("/");
  await openFirstStudySpace(page);
  return selections;
}

test("documents without chapters generate from the whole document", async ({
  page,
}) => {
  const selections = await open(page);
  await expect(
    page.getByText("From the whole document (6 pages)"),
  ).toBeVisible();
  await expect(page.getByLabel("Generate from")).toHaveCount(0);
  await page.getByRole("button", { name: "Generate concepts" }).click();
  await expect
    .poll(() => selections)
    .toEqual([{ startLocation: 1, endLocation: 6 }]);
});

test("PDF chapters can be chosen as the generation scope", async ({ page }) => {
  const selections = await open(page, [
    { title: "Chapter 1: Cells", location: 3 },
    { title: "Chapter 2: Energy", location: 5 },
  ]);
  const scope = page.getByLabel("Generate from");
  await expect(scope.locator("option")).toHaveText([
    "Whole document (6 pages)",
    "Chapter 1: Cells (pp. 3–4)",
    "Chapter 2: Energy (pp. 5–6)",
  ]);
  await scope.selectOption({ label: "Chapter 2: Energy (pp. 5–6)" });
  await page.getByRole("button", { name: "Generate concepts" }).click();
  await expect
    .poll(() => selections)
    .toEqual([{ startLocation: 5, endLocation: 6 }]);
});
