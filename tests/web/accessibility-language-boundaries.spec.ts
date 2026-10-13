import { expect, test, type Page } from "@playwright/test";

async function routeEmptySpaces(page: Page) {
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({ json: { schemaVersion: 1, spaces: [] } }),
  );
}

test("applies a saved size while the authenticated session is still loading", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("tai:text-size", "large"),
  );
  await page.route("**/api/session", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      json: {
        schemaVersion: 1,
        user: { id: "learner", name: "Learner", email: "l@example.test" },
      },
    });
  });
  await routeEmptySpaces(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await expect(page.getByRole("status")).toHaveText("Checking your session…");
});

test("keeps a selected size active and announces when storage cannot save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "tai:text-size") throw new Error("storage blocked");
      return original.call(this, key, value);
    };
  });
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        user: { id: "learner", name: "Learner", email: "l@example.test" },
      },
    }),
  );
  await routeEmptySpaces(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();

  const large = page.getByRole("radio", { name: /^A\+ large$/i });
  await large.check();
  await expect(large).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await expect(page.getByRole("alert")).toContainText(
    "could not be saved for your next visit",
  );
});

test("does not expose account settings before sign-in", async ({ page }) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { schemaVersion: 1, user: null } }),
  );
  await page.goto("/");

  await expect(page.getByRole("region", { name: "Settings" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(page.getByText("This preview supports English.")).toBeVisible();
});
