import { expect, test, type Page } from "@playwright/test";
import { routePracticePage } from "./practice-page-fixture";
import { openFirstSpacePractice } from "./shell-navigation";
const user = { id: "ui-user", name: "Learner", email: "learner@example.test" };
const space = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "System Specs",
  createdAt: "2026-10-12T10:00:00.000Z",
};
async function dashboard(page: Page) {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { schemaVersion: 1, user } }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({ json: { schemaVersion: 1, spaces: [space] } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Study Space", exact: true }).click();
}
async function authenticatedHome(page: Page) {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { schemaVersion: 1, user } }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({ json: { schemaVersion: 1, spaces: [space] } }),
  );
  await page.goto("/");
}
async function useLargestText(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("tai:text-size", "largest"),
  );
}
async function expectWithinViewport(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${selector} should have a layout box`).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x, `${selector} left edge`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${selector} right edge`).toBeLessThanOrEqual(
    viewport!.width,
  );
}
test("signed-out landing is responsive and has no application navigation", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { schemaVersion: 1, user: null } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn your course material into understanding.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(page.locator("aside.sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "How TAI works" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeInViewport();
});
test("home dashboard presents two clear next steps without overflow", async ({
  page,
}) => {
  await authenticatedHome(page);
  await expect(
    page.getByRole("heading", { name: "Good to see you, Learner." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open study spaces" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Go to practice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Read. Make sense of it. Recall it." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
test("signed-in shell exposes focused navigation and responsive study-space grid", async ({
  page,
}) => {
  await dashboard(page);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your study spaces" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Study Space", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/^Created /)).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await expect(
    page.getByRole("button", { name: "Study Space", exact: true }),
  ).toBeVisible();
});
test("overflow deletion requires an accessible confirmation", async ({
  page,
}) => {
  await dashboard(page);
  const overflow = page.getByLabel(`More actions for ${space.title}`);
  await overflow.click();
  const deleteTrigger = page.getByRole("button", {
    name: "Delete",
    exact: true,
  });
  await deleteTrigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("This removes the file and all progress");
  await expect(
    dialog.getByRole("button", { name: "Delete", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          document.querySelector("dialog")?.contains(document.activeElement),
        ),
      ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(deleteTrigger).toBeFocused();
});
test("settings use segmented text-size choices", async ({ page }) => {
  await dashboard(page);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const largest = page.getByRole("radio", { name: /largest/i });
  await largest.focus();
  await expect(largest).toBeFocused();
  await largest.press("Space");
  await expect(largest).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute(
    "data-text-size",
    "largest",
  );
});
test("practice keeps questions primary and supporting modes compact", async ({
  page,
}) => {
  await routePracticePage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await expect(
    page.getByRole("heading", { name: "Strengthen what you understand." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Practice questions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep the ideas moving." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review and apply" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
for (const width of [320, 360]) {
  test(`A++ landing stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 });
    await useLargestText(page);
    await page.route("**/api/session", (route) =>
      route.fulfill({ json: { schemaVersion: 1, user: null } }),
    );
    await page.goto("/");
    await expectWithinViewport(page, ".landing-copy");
    await expectWithinViewport(page, ".landing-cta");
    await expectWithinViewport(page, ".learning-vignette");
  });
  test(`A++ authenticated surfaces stay usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 760 });
    await useLargestText(page);
    await authenticatedHome(page);
    await expectWithinViewport(page, ".primary-step");
    await expectWithinViewport(page, ".primary-step button");
    await page
      .getByRole("button", { name: "Study Space", exact: true })
      .click();
    await expectWithinViewport(page, ".space-card");
    await expectWithinViewport(
      page,
      "#open-11111111-1111-4111-8111-111111111111",
    );
    await expectWithinViewport(page, ".new-space-card");
    await expectWithinViewport(page, "#space-title");
  });
  test(`A++ practice controls stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 });
    await useLargestText(page);
    await routePracticePage(page);
    await page.goto("/");
    await openFirstSpacePractice(page);
    await expectWithinViewport(page, ".activity-pack");
    await expectWithinViewport(page, ".resume-session");
    await expectWithinViewport(page, ".flashcards-card");
    await expectWithinViewport(page, ".flashcards-card > button");
  });
}
