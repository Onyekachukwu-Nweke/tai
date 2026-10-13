import type { Page } from "@playwright/test";

export async function openFirstStudySpace(page: Page) {
  await page.getByRole("button", { name: "Study Space", exact: true }).click();
  await page
    .getByRole("button", { name: /^More actions for / })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Preview material" }).click();
}

export async function showStudySpaces(page: Page) {
  await page.getByRole("button", { name: "Study Space", exact: true }).click();
}

export async function openFirstSpacePractice(page: Page) {
  await openFirstStudySpace(page);
  await page.getByRole("button", { name: "Start practice ▶" }).click();
}

export async function resumePracticeSession(page: Page) {
  await page.getByRole("button", { name: /^Resume session/ }).click();
}

export async function exitFocusForSessionSettings(page: Page) {
  await page.getByRole("button", { name: /^Exit/ }).click();
  await page.getByText("Start a different session").click();
}
