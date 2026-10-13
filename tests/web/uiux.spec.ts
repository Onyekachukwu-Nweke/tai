import { expect, test, type Page } from "@playwright/test";
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
  await expect(page.getByRole("button", { name: "▶ Open" })).toBeVisible();
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
