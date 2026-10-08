import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { MaterialPreview } from "../../apps/web/src/material/types";

const id = "11111111-1111-4111-8111-111111111111";
const materialUrl = `/api/study-spaces/${id}/material`;
const originalUrl = `${materialUrl}/original`;
const documentId = "22222222-2222-4222-8222-222222222222";
const texts = [
  "Photosynthesis uses light energy.",
  "Plants produce glucose and oxygen.",
];

const material: MaterialPreview = {
  schemaVersion: 1 as const,
  documentId,
  filename: "two-page.pdf",
  format: "pdf" as const,
  sections: texts.map((text, index) => ({ location: index + 1, text })),
  chunks: texts.map((text, index) => ({
    id: `${documentId}:${index + 1}:0`,
    documentId,
    location: index + 1,
    start: 0,
    end: text.length,
    text,
  })),
  warnings: [],
};

async function openSavedPdf(
  page: Page,
  savedMaterial: MaterialPreview = material,
) {
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
            createdAt: "2026-10-08T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route(`**${materialUrl}`, (route) =>
    route.fulfill({ json: { schemaVersion: 1, material: savedMaterial } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(page.locator("pre")).toContainText(
    savedMaterial.sections[0].text,
  );
}

async function servePdf(page: Page) {
  const pdf = await readFile(resolve("tests/fixtures/materials/two-page.pdf"));
  await page.route(`**${originalUrl}`, (route) =>
    route.fulfill({
      body: pdf,
      contentType: "application/pdf",
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }),
  );
}

test("saved PDF fetch is explicit and page navigation stays aligned with extracted text", async ({
  page,
}) => {
  let fetches = 0;
  await servePdf(page);
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === originalUrl) fetches += 1;
  });
  await openSavedPdf(page);
  expect(fetches).toBe(0);
  await page.getByRole("button", { name: "View PDF page" }).click();
  await expect(page.getByLabel("Rendered PDF page 1")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("PDF page 1 of 2 ready.")).toBeVisible({
    timeout: 15_000,
  });
  expect(fetches).toBe(1);

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByLabel("Rendered PDF page 1")).toBeHidden();
  await expect(page.getByLabel("Rendered PDF page 2")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator("pre")).toContainText(texts[1]);
  await page.getByLabel("PDF page", { exact: true }).selectOption("1");
  await expect(page.locator("pre")).toContainText(texts[0]);
  expect(fetches).toBe(1);
});

test("reader failure keeps extracted text and retries only when requested", async ({
  page,
}) => {
  const pdf = await readFile(resolve("tests/fixtures/materials/two-page.pdf"));
  let requests = 0;
  await page.route(`**${originalUrl}`, (route) => {
    requests += 1;
    return requests === 1
      ? route.abort("failed")
      : route.fulfill({ body: pdf, contentType: "application/pdf" });
  });
  await openSavedPdf(page);
  await page.getByRole("button", { name: "View PDF page" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("pre")).toContainText(texts[0]);
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Retry opening PDF" }).click();
  await expect(page.getByLabel("Rendered PDF page 1")).toBeVisible();
  expect(requests).toBe(2);
});

test("closing during a pending fetch aborts the reader without hiding text", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  await page.route(`**${originalUrl}`, async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.abort("failed").catch(() => undefined);
  });
  await openSavedPdf(page);
  await page.getByRole("button", { name: "View PDF page" }).click();
  await expect(page.getByText("Loading saved PDF…")).toBeVisible();
  await page.getByRole("button", { name: "Close PDF reader" }).click();
  release?.();
  await expect(
    page.getByRole("button", { name: "View PDF page" }),
  ).toBeVisible();
  await expect(page.locator("pre")).toContainText(texts[0]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("reader fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await servePdf(page);
  await openSavedPdf(page);
  await page.getByRole("button", { name: "View PDF page" }).click();
  const canvas = page.getByLabel("Rendered PDF page 1");
  await expect(canvas).toBeVisible();
  expect(
    await canvas.evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(325);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("saved TXT remains text-only and does not fetch the original", async ({
  page,
}) => {
  const text = "Synthetic text source.";
  const txt = {
    ...material,
    filename: "source.txt",
    format: "txt" as const,
    sections: [{ location: 1, text }],
    chunks: [
      {
        id: `${documentId}:1:0`,
        documentId,
        location: 1,
        start: 0,
        end: text.length,
        text,
      },
    ],
  };
  let originals = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === originalUrl) originals += 1;
  });
  await openSavedPdf(page, txt);
  await expect(page.locator("pre")).toContainText(text);
  await expect(page.getByRole("button", { name: "View PDF page" })).toHaveCount(
    0,
  );
  expect(originals).toBe(0);
});
