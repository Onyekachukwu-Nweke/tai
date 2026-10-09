import { expect, test } from "@playwright/test";
import { routeRubricPage } from "./rubric-page-fixture";

test("preserves an explanation across grading failure and restores rubric feedback", async ({
  page,
}) => {
  await routeRubricPage(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(page.getByText("Scenario · about 3 min")).toBeVisible();
  await expect(
    page.getByText("Water and temperature remain unchanged."),
  ).toBeVisible();
  await page.getByLabel("Your response").fill("Light supplies energy.");
  await page.getByRole("button", { name: "Save scenario response" }).click();
  await expect(
    page.getByText(/Grading interrupted.*saved response/),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain(
    "Light supplies energy.",
  );
  await page.getByRole("button", { name: "Retry rubric feedback" }).click();
  await expect(
    page.getByText(/Source-supported rubric outcome: partial/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practise this gap" }).click();
  await expect(
    page.getByText(/Follow-up interrupted.*saved response and feedback/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry targeted follow-up" }).click();
  await expect(
    page.getByText(
      "How would added light affect growth under these assumptions?",
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Light supplies energy.",
  );
  await page.reload();
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(
    page.getByText("Add the role described in the cited source."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "How would added light affect growth under these assumptions?",
    ),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Targeted follow-up" })
    .getByRole("button", { name: "Open supporting section 1" })
    .click();
  await expect(page.locator("mark")).toHaveText(
    "Light supplies energy to plants.",
  );
});

test("keeps a flagged scenario draft while disabling rubric submission", async ({
  page,
}) => {
  await routeRubricPage(page, { flagged: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  await page.getByLabel("Your response").fill("My retained scenario draft");
  await expect(
    page.getByText(/cannot be submitted for rubric feedback/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save scenario response" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain(
    "My retained scenario draft",
  );
});
