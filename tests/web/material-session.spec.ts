import { openFirstStudySpace } from "./shell-navigation";
import { expect, test, type Page } from "@playwright/test";

const id = "11111111-1111-4111-8111-111111111111";
const endpoint = `**/api/study-spaces/${id}/material`;

async function open(page: Page) {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        user: {
          id: "synthetic-user",
          name: "Learner",
          email: "learner@example.test",
        },
      },
    }),
  );
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        spaces: [
          {
            id,
            title: "Synthetic biology",
            createdAt: "2026-10-07T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Synthetic sign-in failure" },
    }),
  );
  await page.goto("/");
  await openFirstStudySpace(page);
}

async function failedSignIn(page: Page) {
  await expect(page.getByText(/select any unsaved file again/)).toBeVisible();
  await page.getByRole("button", { name: "Sign in again" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sign-in could not start" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in again" }),
  ).toBeEnabled();
}

test("401 material load offers sign-in and failed authentication keeps recovery controls", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await open(page);
  await expect(page.getByRole("alert")).toContainText(/session|sign in/i);
  await expect(page.getByLabel("Choose a PDF or TXT file")).toHaveCount(0);
  await failedSignIn(page);
  await expect(
    page.getByRole("button", { name: "Retry loading material" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic biology", exact: true }),
  ).toBeVisible();
});

test("401 material save retains preview and filename after failed sign-in without replaying save", async ({
  page,
}) => {
  let posts = 0;
  await page.route(endpoint, (route) => {
    if (route.request().method() === "POST") {
      posts += 1;
      return route.fulfill({ status: 401, json: {} });
    }
    return route.fulfill({ json: { schemaVersion: 1, material: null } });
  });
  await open(page);
  await page.getByLabel("Choose a PDF or TXT file").setInputFiles({
    name: "reviewed-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic source evidence."),
  });
  await expect(
    page.getByRole("region", { name: "Selected material" }),
  ).toContainText("reviewed-notes.txt");
  await page
    .getByRole("button", { name: "Save material", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/session|sign in/i);
  await failedSignIn(page);
  await expect(
    page.getByRole("region", { name: "Selected material" }),
  ).toContainText("reviewed-notes.txt");
  await expect(
    page.getByRole("heading", { name: "reviewed-notes.txt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save material", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Your material" }),
  ).toHaveCount(0);
  expect(posts).toBe(1);
});
