import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const fixture = (name: string) => resolve("tests/fixtures/materials", name);
const fileInput = (page: Page) => page.getByLabel("Choose a PDF or TXT file");
const extracted = (page: Page) => page.locator("pre");

async function openPreview(page: Page) {
  await page.route("**/api/study-spaces/*/material", (route) =>
    route.fulfill({ json: { schemaVersion: 1, material: null } }),
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        user: {
          id: "synthetic-learner",
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
            id: "11111111-1111-4111-8111-111111111111",
            title: "Synthetic biology",
            createdAt: "2026-10-06T12:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(
    page.getByRole("heading", { name: /Material preview/ }),
  ).toBeVisible();
}

async function selectText(page: Page, text: string, name = "lesson.txt") {
  await fileInput(page).setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from(text),
  });
}

test("TXT stays local, displays source markup literally, and discloses preview limits", async ({
  page,
}) => {
  const unexpected: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() !== "GET" || url.origin !== "http://127.0.0.1:5173") {
      unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
  });
  await openPreview(page);
  await expect(page.getByText(/10 MB/)).toBeVisible();
  await expect(page.getByText(/50 PDF pages/)).toBeVisible();
  await expect(page.getByText(/not uploaded or saved/i)).toBeVisible();
  const text =
    '<script>window.materialExecuted=true</script>\n<img src="https://example.test/private" onerror="alert(1)">\nCells contain DNA.';
  await selectText(page, text);
  await expect(extracted(page)).toContainText(text);
  await expect(extracted(page).locator("script, img, a")).toHaveCount(0);
  expect(await page.evaluate(() => "materialExecuted" in window)).toBe(false);
  expect(unexpected).toEqual([]);
  await page.reload();
  await page.getByRole("button", { name: "Preview material" }).click();
  await expect(extracted(page)).toHaveCount(0);
});

test("failed replacement preserves readable material and the same file can be selected again", async ({
  page,
}) => {
  await openPreview(page);
  await selectText(page, "Cells contain DNA.");
  await expect(extracted(page)).toContainText("Cells contain DNA.");
  await selectText(page, "   \n\t", "blank.txt");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(extracted(page)).toContainText("Cells contain DNA.");
  await page.getByRole("button", { name: "Retry extraction" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(extracted(page)).toContainText("Cells contain DNA.");
  await selectText(page, "Cells contain DNA.");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(extracted(page)).toContainText("Cells contain DNA.");
});

for (const input of [
  { name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) },
  {
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from([0xc3, 0x28]),
  },
  {
    name: "binary.txt",
    mimeType: "text/plain",
    buffer: Buffer.from([65, 0, 66]),
  },
  {
    name: "unsupported.html",
    mimeType: "text/html",
    buffer: Buffer.from("<p>Cells</p>"),
  },
  {
    name: "corrupt.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\ncorrupt data"),
  },
  {
    name: "oversized.txt",
    mimeType: "text/plain",
    buffer: Buffer.alloc(10_000_001, 65),
  },
]) {
  test(`rejects ${input.name} with an actionable message`, async ({ page }) => {
    await openPreview(page);
    await fileInput(page).setInputFiles(input);
    await expect(page.getByRole("alert")).toContainText(
      /choose|export|try|limit|smaller|supported/i,
    );
    await expect(extracted(page)).toHaveCount(0);
  });
}

test("mobile preview wraps long source lines and keeps file controls accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPreview(page);
  await selectText(page, "Synthetic source " + "A".repeat(500));
  await expect(extracted(page)).toContainText("Synthetic source");
  await fileInput(page).focus();
  await expect(fileInput(page)).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(
    page.getByRole("heading", { name: /Material preview/ }),
  ).toHaveCount(0);
});

test("extracts real PDF pages using a local worker and preserves page selection", async ({
  page,
}) => {
  const requests: { url: string; method: string }[] = [];
  page.on("request", (request) => {
    requests.push({ url: request.url(), method: request.method() });
  });
  await openPreview(page);
  await fileInput(page).setInputFiles(fixture("two-page.pdf"));
  await expect(extracted(page)).toContainText(
    "Photosynthesis uses light energy.",
  );
  const sections = page.getByLabel("Page or section");
  await expect(sections.locator("option")).toHaveCount(2);
  await sections.selectOption({ index: 1 });
  await expect(extracted(page)).toContainText(
    "Plants produce glucose and oxygen.",
  );
  expect(requests.some(({ url }) => url.includes("pdf.worker"))).toBe(true);
  expect(
    requests.every(
      ({ url, method }) =>
        method === "GET" && new URL(url).origin === "http://127.0.0.1:5173",
    ),
  ).toBe(true);
});

test("equation text is inspectable with an explicit fidelity warning", async ({
  page,
}) => {
  await openPreview(page);
  await fileInput(page).setInputFiles(fixture("equation.pdf"));
  await expect(extracted(page)).toContainText("Force = mass x acceleration");
  await expect(extracted(page)).toContainText("F = m a; 2 kg x 3 m/s^2 = 6 N");
  await expect(
    page.getByText(/Check equations, symbols, tables, and reading order/),
  ).toBeVisible();
  await expect(page.getByText(/does not verify correctness/)).toBeVisible();
});

test("accepts exactly 50 PDF pages and rejects 51 without erasing the preview", async ({
  page,
}) => {
  await openPreview(page);
  await fileInput(page).setInputFiles(fixture("fifty-pages.pdf"));
  const sections = page.getByLabel("Page or section");
  await expect(sections.locator("option")).toHaveCount(50);
  await sections.selectOption({ index: 49 });
  await expect(extracted(page)).toContainText(/Page 50/i);
  await fileInput(page).setInputFiles(fixture("fifty-one-pages.pdf"));
  await expect(page.getByRole("alert")).toContainText(/50/);
  await expect(extracted(page)).toContainText(/Page 50/i);
});

test("textless PDF reports that a text-based source is needed", async ({
  page,
}) => {
  await openPreview(page);
  await fileInput(page).setInputFiles(fixture("blank.pdf"));
  await expect(page.getByRole("alert")).toContainText(
    /text-based PDF|extractable text/i,
  );
  await expect(extracted(page)).toHaveCount(0);
});

test("password-protected PDF is rejected without asking for credentials", async ({
  page,
}) => {
  await openPreview(page);
  await fileInput(page).setInputFiles(fixture("password.pdf"));
  await expect(page.getByRole("alert")).toContainText(
    /password-protected|unlocked/i,
  );
  await expect(extracted(page)).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("mixed PDF retains the blank page location and warns about missing text", async ({
  page,
}) => {
  await openPreview(page);
  await fileInput(page).setInputFiles(fixture("mixed.pdf"));
  await expect(extracted(page)).toContainText("Readable first page.");
  await expect(
    page.getByRole("list", { name: "Extraction warnings" }),
  ).toContainText(/2|text/i);
  await page.getByLabel("Page or section").selectOption({ label: "Page 2" });
  await expect(extracted(page)).toContainText(/No text/);
});

test("cancelling a pending PDF preserves the old preview and explicit retry can finish", async ({
  page,
}) => {
  await openPreview(page);
  await selectText(page, "Keep these earlier notes.");
  await expect(extracted(page)).toContainText("Keep these earlier notes.");
  let releaseWorker: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    releaseWorker = resolve;
  });
  await page.route("**/*pdf.worker*", async (route) => {
    await held;
    await route.continue();
  });
  await fileInput(page).setInputFiles(fixture("two-page.pdf"));
  await page.getByRole("button", { name: "Cancel extraction" }).click();
  releaseWorker();
  await expect(
    page.getByText("Extraction cancelled.", { exact: false }),
  ).toBeVisible();
  await expect(extracted(page)).toContainText("Keep these earlier notes.");
  await page.getByRole("button", { name: "Retry extraction" }).click();
  await expect(extracted(page)).toContainText(
    "Photosynthesis uses light energy.",
  );
});
