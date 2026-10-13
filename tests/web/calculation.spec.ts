import {
  openFirstSpacePractice,
  resumePracticeSession,
} from "./shell-navigation";
import { expect, test } from "@playwright/test";
import { routeCalculationPage } from "./calculation-page-fixture";

test("checks a calculation locally, saves authoritative numeric and separate working feedback", async ({
  page,
}) => {
  const state = await routeCalculationPage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  await expect(page.getByText("Distance d = 120 m")).toBeVisible();
  await expect(page.locator(".katex-mathml math")).toBeVisible();
  await page.getByLabel("Final answer (one number and unit)").fill("12 km");
  await page.getByLabel("Show your working").fill("120 divided by 10 is 12.");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/That unit is not supported/)).toBeVisible();
  expect(state.saves()).toBe(0);
  await page.getByLabel("Final answer (one number and unit)").fill("43.2 km/h");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Numeric result: correct/)).toBeVisible();
  await expect(
    page.getByText(/Worker confirmed the browser check/),
  ).toBeVisible();
  await expect(page.getByText(/Accepted key: 12 m\/s/)).toBeVisible();
  await expect(
    page.getByText("Divide 120 m by 10 s to obtain 12 m/s."),
  ).toBeVisible();
  await expect(
    page.getByText(/Source-supported rubric outcome: uncertain/),
  ).toBeVisible();
  expect(state.saves()).toBe(1);
  await page.reload();
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  await expect(page.getByText(/Numeric result: correct/)).toBeVisible();
  await expect(page.getByText(/Accepted key: 12 m\/s/)).toBeVisible();
  await expect(
    page.getByText("Divide 120 m by 10 s to obtain 12 m/s."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The number is correct; this fake provider cannot judge the working.",
    ),
  ).toBeVisible();
});
