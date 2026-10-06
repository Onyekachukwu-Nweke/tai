import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "synthetic-user",
  name: "Learner",
  email: "learner@example.test",
};
const space = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Introductory biology",
  createdAt: "2026-10-06T12:00:00.000Z",
};

async function session(page: Page, signedIn = true) {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { schemaVersion: 1, user: signedIn ? user : null } }),
  );
}

test("signed-out learners see Google sign-in and keyboard-accessible content", async ({
  page,
}) => {
  await session(page, false);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create study space" }),
  ).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeInViewport();
});

test("session setup failure is actionable and retries only when requested", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/session", (route) => {
    requests += 1;
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Sign-in is not available yet",
  );
  const initialRequests = requests;
  await page.clock.install();
  await page.clock.runFor(30_000);
  expect(requests).toBe(initialRequests);
  await session(page, false);
  await page.getByRole("button", { name: "Retry session check" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("authenticated learners create and reload a saved space", async ({
  page,
}) => {
  await session(page);
  let saved = false;
  await page.route("**/api/study-spaces", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        schemaVersion: 1,
        title: space.title,
      });
      saved = true;
      await route.fulfill({ status: 201, json: { schemaVersion: 1, space } });
    } else {
      await route.fulfill({
        json: { schemaVersion: 1, spaces: saved ? [space] : [] },
      });
    }
  });
  await page.goto("/");
  await expect(
    page.getByText("No study spaces yet.", { exact: false }),
  ).toBeVisible();
  const title = page.getByRole("textbox", {
    name: "What would you like to learn?",
  });
  await title.fill(space.title);
  await title.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Study space saved.");
  await expect(title).toHaveValue("");
  await expect(page.getByRole("heading", { name: space.title })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: space.title })).toBeVisible();
});

test("failed saves retain the title and reconnection never replays creation", async ({
  page,
}) => {
  await session(page);
  let posts = 0;
  await page.route("**/api/study-spaces", async (route) => {
    if (route.request().method() === "POST") {
      posts += 1;
      await route.abort("failed");
    } else {
      await route.fulfill({ json: { schemaVersion: 1, spaces: [] } });
    }
  });
  await page.goto("/");
  const title = page.getByRole("textbox", {
    name: "What would you like to learn?",
  });
  await title.fill(space.title);
  await page.getByRole("button", { name: "Create study space" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your title is still here",
  );
  await expect(title).toHaveValue(space.title);
  await page.clock.install();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await page.clock.runFor(30_000);
  expect(posts).toBe(1);
  await page.getByRole("button", { name: "Reload study spaces" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(title).toHaveValue(space.title);
  expect(posts).toBe(1);
});

test("mobile layout keeps creation controls within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await session(page);
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({ json: { schemaVersion: 1, spaces: [] } }),
  );
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Create study space" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("pending saves prevent duplicate requests and protect newer input", async ({
  page,
}) => {
  await session(page);
  let finishSave: (() => void) | undefined;
  let posts = 0;
  const pending = new Promise<void>((resolve) => {
    finishSave = resolve;
  });
  await page.route("**/api/study-spaces", async (route) => {
    if (route.request().method() === "POST") {
      posts += 1;
      await pending;
      await route.fulfill({ status: 201, json: { schemaVersion: 1, space } });
    } else {
      await route.fulfill({ json: { schemaVersion: 1, spaces: [] } });
    }
  });
  await page.goto("/");
  const title = page.getByRole("textbox");
  await title.fill(space.title);
  await page.getByRole("button", { name: "Create study space" }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  const editable = await title.isEnabled();
  if (editable) await title.fill("A second subject");
  finishSave?.();
  await expect(page.getByRole("status")).toHaveText("Study space saved.");
  await expect(title).toHaveValue(editable ? "A second subject" : "");
  expect(posts).toBe(1);
});

test("expired sessions offer sign-in and retain the unsaved title if sign-in fails", async ({
  page,
}) => {
  await session(page);
  await page.route("**/api/study-spaces", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 401, json: {} })
      : route.fulfill({ json: { schemaVersion: 1, spaces: [] } }),
  );
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({ status: 503, json: { message: "Synthetic auth outage" } }),
  );
  await page.goto("/");
  const title = page.getByRole("textbox");
  await title.fill(space.title);
  await page.getByRole("button", { name: "Create study space" }).click();
  await expect(page.getByRole("alert")).toContainText("Your session has ended");
  await expect(title).toHaveValue(space.title);
  await page.getByRole("button", { name: "Sign in again" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Sign-in could not start",
  );
  await expect(title).toHaveValue(space.title);
});
