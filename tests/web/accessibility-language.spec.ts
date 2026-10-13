import { expect, test, type Page } from "@playwright/test";

async function openSettings(page: Page, stored?: string, blockStorage = false) {
  if (blockStorage)
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
  if (stored !== undefined)
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      ["tai:text-size", stored],
    );
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        user: { id: "learner", name: "Learner", email: "l@example.test" },
      },
    }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({ json: { schemaVersion: 1, spaces: [] } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  return page.getByRole("region", { name: "Settings" });
}

test("persists an accessible text-size choice across reload", async ({
  page,
}) => {
  const settings = await openSettings(page);
  const largest = settings.getByRole("radio", { name: /largest/i });
  await largest.focus();
  await expect(largest).toBeFocused();
  await largest.press("Space");
  await expect(largest).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute(
    "data-text-size",
    "largest",
  );
  await page.reload();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("radio", { name: /largest/i })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute(
    "data-text-size",
    "largest",
  );
});

test("rejects a corrupt stored preference and discloses English-only limits", async ({
  page,
}) => {
  const settings = await openSettings(page, "oversized");
  await expect(
    settings.getByRole("radio", { name: /standard/i }),
  ).toBeChecked();
  await expect(settings).toContainText(
    "TAI currently supports English interface and learning materials.",
  );
});

test("loads and applies a tab-only size when browser storage is unavailable", async ({
  page,
}) => {
  const settings = await openSettings(page, undefined, true);
  await expect(
    settings.getByRole("radio", { name: /standard/i }),
  ).toBeChecked();
  await settings.getByRole("radio", { name: /largest/i }).check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-text-size",
    "largest",
  );
  await expect(settings.getByRole("alert")).toContainText("could not be saved");
});

for (const width of [320, 360]) {
  test(`largest text reflows at ${width}px with usable controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const settings = await openSettings(page, "largest");
    await settings.scrollIntoViewIfNeeded();
    await expect(settings).toBeInViewport();
    const dimensions = await settings.evaluate((element) => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      labels: [...element.querySelectorAll("label")].map((label) =>
        label.getBoundingClientRect(),
      ),
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    for (const label of dimensions.labels) {
      expect(label.height).toBeGreaterThanOrEqual(44);
      expect(label.left).toBeGreaterThanOrEqual(0);
      expect(label.right).toBeLessThanOrEqual(width);
    }
  });
}
