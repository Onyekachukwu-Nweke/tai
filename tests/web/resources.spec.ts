import { openFirstStudySpace } from "./shell-navigation";
import { expect, test, type Page, type Route } from "@playwright/test";

const spaceId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const conceptId = "33333333-3333-4333-8333-333333333333";
const chunkId = `${documentId}:1:0`;
const text = "Project management uses planning and project life cycles.";
const concepts = {
  schemaVersion: 1,
  status: "ready",
  requestId: "44444444-4444-4444-8444-444444444444",
  scope: { startLocation: 1, endLocation: 1 },
  concepts: [
    {
      id: conceptId,
      title: "Project management",
      label: "Project management",
      description: "Planning a project",
      selected: true,
      sources: [{ id: chunkId, location: 1, start: 0, end: text.length, text }],
    },
  ],
  relations: [],
  error: null,
  provider: "fake",
};
const recommendation = {
  id: "openlearn-project-management",
  title: "Project management: the start of the project journey",
  publisher: "The Open University — OpenLearn",
  url: "https://example.com/free-project-course",
  language: "English",
  format: "course",
  accessConditions: "Free to read without an account.",
  checkedAt: "2026-10-12",
  relevance: "Explains planning and project life cycles.",
  supportedConcept: { id: conceptId, label: "Project management" },
};

async function openResources(
  page: Page,
  respond: (route: Route) => Promise<void> | void,
) {
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
          { id: spaceId, title: "Projects", createdAt: "2026-10-12T00:00:00Z" },
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
          filename: "projects.txt",
          format: "txt",
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
  await page.route(`**/api/study-spaces/${spaceId}/concepts`, (route) =>
    route.fulfill({ json: concepts }),
  );
  await page.route(`**/api/study-spaces/${spaceId}/resources`, respond);
  await page.goto("/");
  await openFirstStudySpace(page);
}

test("states honest no-match and limited catalog coverage", async ({
  page,
}) => {
  await openResources(page, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        recommendations: [],
        unmatchedConcepts: [{ id: conceptId, label: "Project management" }],
      },
    }),
  );
  await expect(
    page.getByText("No suitable checked resource was found", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Concepts without a checked match"),
  ).toContainText("Project management");
});

test("shows an error and succeeds only after explicit retry", async ({
  page,
}) => {
  let calls = 0;
  let succeed = false;
  await openResources(page, (route) => {
    calls += 1;
    return !succeed
      ? route.fulfill({
          status: 503,
          json: { error: "Resources unavailable." },
        })
      : route.fulfill({
          json: {
            schemaVersion: 1,
            recommendations: [recommendation],
            unmatchedConcepts: [],
          },
        });
  });
  await expect(
    page
      .getByRole("region", { name: "Supplementary resources" })
      .getByRole("alert"),
  ).toContainText("Resources unavailable");
  const callsBeforeRetry = calls;
  succeed = true;
  await page.getByRole("button", { name: "Retry resources" }).click();
  await expect(
    page.getByRole("heading", { name: recommendation.title }),
  ).toBeVisible();
  expect(calls).toBe(callsBeforeRetry + 1);
});

test("contacts an external resource only after keyboard activation", async ({
  page,
  context,
}) => {
  const externalRequests: string[] = [];
  context.on("request", (request) => {
    if (new URL(request.url()).hostname === "example.com")
      externalRequests.push(request.url());
  });
  await context.route("https://example.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Free course" }),
  );
  await openResources(page, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        recommendations: [recommendation],
        unmatchedConcepts: [],
      },
    }),
  );
  const originalUrl = page.url();
  const link = page.getByRole("link", { name: /Open resource/ });
  await link.focus();
  await expect(link).toBeFocused();
  expect(externalRequests).toEqual([]);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    link.press("Enter"),
  ]);
  await expect
    .poll(() => popup.url())
    .toContain("example.com/free-project-course");
  expect(page.url()).toBe(originalUrl);
  expect(externalRequests).toHaveLength(1);
});

test("keeps resource metadata and its link usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openResources(page, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        recommendations: [recommendation],
        unmatchedConcepts: [],
      },
    }),
  );
  const section = page.getByRole("region", { name: "Supplementary resources" });
  const link = section.getByRole("link", { name: /Open resource/ });
  await expect(section).toContainText("Free to read without an account");
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeInViewport();
  const box = await link.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
