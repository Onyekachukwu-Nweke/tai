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

export async function openFirstPractice(page: Page) {
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  const open = page.getByRole("button", { name: "▶ Open" }).first();
  if (await open.isVisible().catch(() => false)) await open.click();
}

export async function openFirstSpacePractice(page: Page) {
  await openFirstStudySpace(page);
  await page.getByRole("button", { name: "Start practice ▶" }).click();
}
