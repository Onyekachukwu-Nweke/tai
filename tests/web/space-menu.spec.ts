import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "menu-user",
  name: "Learner",
  email: "learner@example.test",
};
const space = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "System Specs",
  createdAt: "2026-10-12T10:00:00.000Z",
};

async function openLibrary(page: Page) {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { schemaVersion: 1, user } }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({ json: { schemaVersion: 1, spaces: [space] } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Study Space", exact: true }).click();
}

test("space actions and deletion confirmation stay compact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openLibrary(page);
  await page.getByLabel(`More actions for ${space.title}`).click();
  const menu = page.getByRole("menu");
  const menuMetrics = await menu.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    heights: [...element.querySelectorAll("button")].map(
      (button) => button.getBoundingClientRect().height,
    ),
  }));
  expect(menuMetrics.width).toBeLessThanOrEqual(190);
  expect(Math.max(...menuMetrics.heights)).toBeLessThanOrEqual(40);

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
  const metrics = await dialog
    .locator(".delete-dialog-actions")
    .evaluate((element) => {
      const [deleteButton, cancelButton] = [
        ...element.querySelectorAll("button"),
      ].map((button) => button.getBoundingClientRect());
      return {
        rowWidth: element.getBoundingClientRect().width,
        deleteWidth: deleteButton!.width,
        cancelWidth: cancelButton!.width,
        cancelBeforeDelete: cancelButton!.x < deleteButton!.x,
      };
    });
  expect(metrics.deleteWidth).toBeLessThan(metrics.rowWidth / 2);
  expect(metrics.cancelWidth).toBeLessThan(metrics.rowWidth / 2);
  expect(metrics.cancelBeforeDelete).toBe(true);

  await page.keyboard.press("Shift+Tab");
  await expect(dialog).toContainText("Cancel");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(deleteTrigger).toBeFocused();
});
