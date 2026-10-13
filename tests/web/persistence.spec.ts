import { openFirstStudySpace } from "./shell-navigation";
import {
  expect,
  test,
  type Page,
  type Request as BrowserRequest,
} from "@playwright/test";
import type { MaterialPreview } from "../../apps/web/src/material/types";

const id = "11111111-1111-4111-8111-111111111111";
const endpoint = `**/api/study-spaces/${id}/material`;
const sourceText = "Synthetic cells contain DNA.";
const input = (page: Page) => page.getByLabel("Choose a PDF or TXT file");
const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Save material", exact: true });

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
  await page.goto("/");
  await openFirstStudySpace(page);
  await expect(input(page)).toBeEnabled();
}

const selected = (page: Page) =>
  page.getByRole("region", { name: "Selected material" });

async function selectSource(page: Page) {
  await input(page).setInputFiles({
    name: "source.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(sourceText),
  });
  await expect(selected(page)).toContainText("source.txt");
}

async function readUpload(request: BrowserRequest) {
  const body = request.postDataBuffer();
  if (!body) throw new Error("Expected multipart material upload");
  const form = await new Response(new Uint8Array(body), {
    headers: { "Content-Type": request.headers()["content-type"] },
  }).formData();
  const original = form.get("original");
  const rawPreview = form.get("preview");
  if (!(original instanceof File) || typeof rawPreview !== "string") {
    throw new Error("Expected original file and preview JSON");
  }
  return {
    originalName: original.name,
    originalText: await original.text(),
    preview: JSON.parse(rawPreview) as MaterialPreview,
  };
}

async function reconnectWithoutReplay(page: Page) {
  await page.clock.install();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await page.clock.runFor(30_000);
}

async function requestDeletion(page: Page) {
  const close = page.getByRole("button", { name: "Close preview" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.getByLabel("More actions for Synthetic biology").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
}

test("saving persists the reviewed original and reload opens one immutable material", async ({
  page,
}) => {
  let stored: MaterialPreview | null = null;
  let posts = 0;
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "POST") {
      posts += 1;
      const upload = await readUpload(route.request());
      expect(upload.originalName).toBe("source.txt");
      expect(upload.originalText).toBe(sourceText);
      expect(upload.preview.sections[0].text).toBe(sourceText);
      stored = upload.preview;
    }
    await route.fulfill({ json: { schemaVersion: 1, material: stored } });
  });
  await open(page);
  await selectSource(page);
  expect(posts).toBe(0);
  await saveButton(page).click();
  await expect(
    page.getByRole("heading", { name: "Your material" }),
  ).toBeVisible();
  await page.reload();
  await openFirstStudySpace(page);
  await expect(selected(page)).toContainText("source.txt");
  await expect(input(page)).toHaveCount(0);
  await expect(saveButton(page)).toHaveCount(0);
  expect(posts).toBe(1);
});

test("failed save keeps exact original and document ID for explicit retry without reconnect replay", async ({
  page,
}) => {
  const uploads: Awaited<ReturnType<typeof readUpload>>[] = [];
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { schemaVersion: 1, material: null } });
      return;
    }
    uploads.push(await readUpload(route.request()));
    if (uploads.length === 1) await route.abort("failed");
    else
      await route.fulfill({
        json: { schemaVersion: 1, material: uploads[1].preview },
      });
  });
  await open(page);
  await selectSource(page);
  await saveButton(page).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(selected(page)).toContainText("source.txt");
  await reconnectWithoutReplay(page);
  expect(uploads).toHaveLength(1);
  await saveButton(page).click();
  await expect(
    page.getByRole("heading", { name: "Your material" }),
  ).toBeVisible();
  expect(uploads).toHaveLength(2);
  expect(uploads[1]).toEqual(uploads[0]);
});

test("failed replacement still uploads the original matching the preserved preview", async ({
  page,
}) => {
  let uploaded: Awaited<ReturnType<typeof readUpload>> | undefined;
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "POST")
      uploaded = await readUpload(route.request());
    await route.fulfill({
      json: { schemaVersion: 1, material: uploaded?.preview ?? null },
    });
  });
  await open(page);
  await selectSource(page);
  await input(page).setInputFiles({
    name: "blank-replacement.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("   "),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(selected(page)).toContainText("source.txt");
  await saveButton(page).click();
  await expect(
    page.getByRole("heading", { name: "Your material" }),
  ).toBeVisible();
  expect(uploaded?.originalName).toBe("source.txt");
  expect(uploaded?.originalText).toBe(sourceText);
  expect(uploaded?.preview.filename).toBe("source.txt");
});

test("failed deletion retains the pending confirmation and retries only explicitly", async ({
  page,
}) => {
  let deletes = 0;
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { schemaVersion: 1, material: null } }),
  );
  await page.route(`**/api/study-spaces/${id}`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    deletes += 1;
    if (deletes === 1) await route.abort("failed");
    else await route.fulfill({ status: 204 });
  });
  await open(page);
  await selectSource(page);
  await requestDeletion(page);
  expect(deletes).toBe(0);
  const confirm = page.getByRole("dialog").getByRole("button", {
    name: "Delete",
    exact: true,
  });
  await confirm.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry deletion" }),
  ).toBeVisible();
  await expect(selected(page)).toHaveCount(0);
  await reconnectWithoutReplay(page);
  expect(deletes).toBe(1);
  await page.getByRole("button", { name: "Retry deletion" }).click();
  await expect(
    page.getByRole("heading", { name: /Upload material|Your material/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preview material" }),
  ).toHaveCount(0);
  expect(deletes).toBe(2);
});

test("cleanup pending never reports successful deletion and allows explicit retry", async ({
  page,
}) => {
  let deletes = 0;
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { schemaVersion: 1, material: null } }),
  );
  await page.route(`**/api/study-spaces/${id}`, async (route) => {
    deletes += 1;
    await route.fulfill({
      status: 202,
      json: { schemaVersion: 1, cleanupPending: true },
    });
  });
  await open(page);
  await requestDeletion(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry deletion" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic biology", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Upload material|Your material/ }),
  ).toHaveCount(0);
  await reconnectWithoutReplay(page);
  expect(deletes).toBe(1);
});

test("failed saved-material load blocks replacement until an explicit successful retry", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { schemaVersion: 1, material: null } }),
  );
  await open(page);
  await page.getByRole("button", { name: "Close preview" }).click();
  let loads = 0;
  let failing = true;
  await page.route(endpoint, (route) => {
    loads += 1;
    return failing
      ? route.abort("failed")
      : route.fulfill({ json: { schemaVersion: 1, material: null } });
  });
  await openFirstStudySpace(page);
  await expect(page.getByRole("alert")).toContainText(
    "Saved material could not be loaded",
  );
  await expect(input(page)).toHaveCount(0);
  const initialLoads = loads;
  await reconnectWithoutReplay(page);
  expect(loads).toBe(initialLoads);
  failing = false;
  await page.getByRole("button", { name: "Retry loading material" }).click();
  await expect(input(page)).toBeEnabled();
  expect(loads).toBe(initialLoads + 1);
});

test("reloaded pending deletion prevents opening material and exposes cleanup retry", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { schemaVersion: 1, material: null } }),
  );
  await open(page);
  await page.route("**/api/study-spaces", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        spaces: [
          {
            id,
            title: "Synthetic biology",
            createdAt: "2026-10-07T00:00:00.000Z",
            deletionPending: true,
          },
        ],
      },
    }),
  );
  let deletes = 0;
  await page.route(`**/api/study-spaces/${id}`, (route) => {
    deletes += 1;
    return route.fulfill({ status: 204 });
  });
  await page.reload();
  await page.getByRole("button", { name: "Study Space", exact: true }).click();
  await page.getByLabel("More actions for Synthetic biology").click();
  await expect(
    page.getByRole("menuitem", { name: "Preview material" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Retry deletion" }),
  ).toBeVisible();
  expect(deletes).toBe(0);
  await page.getByRole("button", { name: "Retry deletion" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic biology", exact: true }),
  ).toHaveCount(0);
  expect(deletes).toBe(1);
});
