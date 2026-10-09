import { expect, test } from "@playwright/test";
import { routeRubricPage } from "./rubric-page-fixture";

test("preserves an explanation across grading failure and restores rubric feedback", async ({
  page,
}) => {
  await routeRubricPage(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  await page.getByLabel("Your response").fill("Light supplies energy.");
  await page.getByRole("button", { name: "Save explanation" }).click();
  await expect(
    page.getByText(/Grading interrupted.*saved explanation/),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain(
    "Light supplies energy.",
  );
  await page.getByRole("button", { name: "Retry rubric feedback" }).click();
  await expect(
    page.getByText(/Source-supported rubric outcome: partial/),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Light supplies energy.",
  );
  await page.reload();
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(
    page.getByText("Add the role described in the cited source."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open supporting section 1" }).click();
  await expect(page.locator("mark")).toHaveText(
    "Light supplies energy to plants.",
  );
});
