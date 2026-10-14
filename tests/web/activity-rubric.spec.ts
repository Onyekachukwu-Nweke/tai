import {
  openFirstSpacePractice,
  resumePracticeSession,
} from "./shell-navigation";
import { expect, test } from "@playwright/test";
import { routeRubricPage } from "./rubric-page-fixture";

test("preserves an explanation across grading failure and restores rubric feedback", async ({
  page,
}) => {
  await routeRubricPage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  await expect(page.getByText("Scenario · about 3 min")).toBeVisible();
  await expect(
    page.getByText("Water and temperature remain unchanged."),
  ).toBeVisible();
  await page.getByLabel("Your response").fill("Light supplies energy.");
  await page.getByRole("button", { name: "Check answer" }).click();
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
  await page
    .getByRole("region", { name: "Targeted follow-up" })
    .getByLabel("Your follow-up response")
    .fill("Added light supplies more energy for growth.");
  await page
    .getByRole("button", { name: "Save and check follow-up response" })
    .click();
  await expect(page.getByText(/Follow-up grading interrupted/)).toBeVisible();
  await expect(page.getByLabel("Your follow-up response")).toHaveValue(
    "Added light supplies more energy for growth.",
  );
  await page.getByRole("button", { name: "Retry follow-up feedback" }).click();
  await expect(
    page.getByText(/Source-supported follow-up outcome: partial/),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Light supplies energy.",
  );
  await page.reload();
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  await expect(
    page.getByText("Add the role described in the cited source."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "How would added light affect growth under these assumptions?",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Your follow-up response")).toHaveValue(
    "Added light supplies more energy for growth.",
  );
  await expect(
    page.getByText("Connect the response directly to the cited role of light."),
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
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  await page.getByLabel("Your response").fill("My retained scenario draft");
  await expect(
    page.getByText(/cannot be submitted for rubric feedback/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check answer" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain(
    "My retained scenario draft",
  );
});

test("restores a completed follow-up grade after its response is lost", async ({
  page,
}) => {
  const observed = await routeRubricPage(page, {
    immediate: true,
    lostFollowupGradeResponse: true,
  });
  await page.goto("/");
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  await page.getByLabel("Your response").fill("Light supplies energy.");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Source-supported rubric outcome/)).toBeVisible();
  await page.getByRole("button", { name: "Practise this gap" }).click();
  await page
    .getByLabel("Your follow-up response")
    .fill("More light provides more energy for growth.");
  await page
    .getByRole("button", { name: "Save and check follow-up response" })
    .click();
  await expect(page.getByText(/Follow-up grading interrupted/)).toBeVisible();
  await page.getByRole("button", { name: "Retry follow-up feedback" }).click();
  await expect(
    page.getByText(/Source-supported follow-up outcome: partial/),
  ).toBeVisible();
  expect(observed.followupGradeCalls()).toBe(1);
});

for (const [outcome, background] of [
  ["supported", "rgb(229, 242, 235)"],
  ["partial", "rgb(248, 240, 216)"],
  ["uncertain", "rgb(237, 241, 239)"],
  ["not_supported", "rgb(251, 233, 231)"],
] as const) {
  test(`rubric ${outcome} keeps a textual label and distinct semantic style`, async ({
    page,
  }) => {
    await routeRubricPage(page, { immediate: true, rubricOutcome: outcome });
    await page.goto("/");
    await openFirstSpacePractice(page);
    await resumePracticeSession(page);
    await page.getByLabel("Your response").fill("A source-grounded response.");
    await page.getByRole("button", { name: "Check answer" }).click();
    const pill = page.locator(".rubric-feedback .outcome-pill");
    await expect(pill).toHaveText(outcome);
    await expect(pill).toHaveCSS("background-color", background);
    const criterion = page.locator(".criterion-outcome");
    await expect(criterion).toHaveText(outcome.replace("_", " "));
    await expect(criterion).toHaveCSS("background-color", background);
  });
}
