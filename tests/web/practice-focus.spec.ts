import { expect, test } from "@playwright/test";
import { routePracticePage } from "./practice-page-fixture";
import {
  openFirstSpacePractice,
  resumePracticeSession,
} from "./shell-navigation";
import { concepts, spaceId } from "./activity-pack-fixture";

test("seeing a recall answer without a response is saved as a reveal", async ({
  page,
}) => {
  const { attempts } = await routePracticePage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await expect(
    page.getByRole("button", { name: /^Resume session/ }),
  ).toContainText("0 of 2 answered");
  await resumePracticeSession(page);
  const focus = page.getByRole("dialog", { name: "Practice session" });
  await expect(focus).toBeVisible();
  await expect(focus.getByText("Recall how plants grow.")).toBeVisible();
  await expect(focus.getByText(/saved as a reveal/)).toBeVisible();
  await focus.getByRole("button", { name: "See the answer" }).click();
  await expect
    .poll(() => attempts.map((item) => item.interaction))
    .toEqual(["reveal"]);
  await page.keyboard.press("ArrowRight");
  await expect(focus.getByText("What helps plants grow?")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(focus).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^Resume session/ }),
  ).toBeFocused();
});

test("a written recall response is self-checked from the keyboard", async ({
  page,
}) => {
  const { attempts } = await routePracticePage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await resumePracticeSession(page);
  const response = page.getByLabel("Your response");
  await response.fill("Plants use light.");
  await response.press("Control+Enter");
  const reveal = page.getByRole("region", { name: "Supported answer" });
  await expect(reveal).toBeFocused();
  await expect(reveal).toContainText("Plants need light and water.");
  await page.keyboard.press("2");
  await expect
    .poll(() => attempts.at(-1))
    .toMatchObject({
      interaction: "recall_self_check",
      selfAssessment: "partial",
      answer: "Plants use light.",
    });
});

test("flashcards flip, rate privately in this browser and never call the server", async ({
  page,
}) => {
  await routePracticePage(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.goto("/");
  await openFirstSpacePractice(page);
  await page.getByRole("button", { name: "Start flashcards" }).click();
  const deck = page.getByRole("dialog", { name: "Flashcards" });
  const [first, second] = concepts.concepts;
  await expect(deck.getByRole("heading", { name: first!.label })).toBeVisible();
  await expect(deck.getByText("From your material")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(deck.getByText("From your material")).toBeVisible();
  await page.keyboard.press("4");
  await expect(
    deck.getByRole("heading", { name: second!.label }),
  ).toBeVisible();
  await deck.getByRole("button", { name: "Flip card" }).click();
  await deck.getByRole("button", { name: "Rate 5 out of 5" }).click();
  await expect(deck.getByText("You rated 2 of 2 cards")).toBeVisible();
  await deck.getByRole("button", { name: "Go again" }).click();
  await expect(deck.getByText("Last rating 4/5")).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
      `tai:concept-self-ratings:${spaceId}`,
    ),
  ).toEqual({ [first!.id]: 4, [second!.id]: 5 });
  await page.keyboard.press("Escape");
  await expect(deck).toBeHidden();
  await expect(page.getByText(/self-rating 4\/5/)).toBeVisible();
  expect(writes).toEqual([]);
});

test("flashcard motion is paced and rapid ratings advance only once", async ({
  page,
}) => {
  await routePracticePage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await page.getByRole("button", { name: "Start flashcards" }).click();
  const deck = page.getByRole("dialog", { name: "Flashcards" });
  await deck.getByRole("button", { name: "Flip card" }).click();
  const transition = await deck
    .locator(".flashcard-inner")
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition).toBe("0.45s");
  await deck
    .getByRole("button", { name: "Rate 4 out of 5" })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(
    deck.getByRole("heading", { name: concepts.concepts[1]!.label }),
  ).toBeVisible();
  await expect(deck.getByText("Deck complete")).toHaveCount(0);
});

test("reduced motion advances flashcards immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await routePracticePage(page);
  await page.goto("/");
  await openFirstSpacePractice(page);
  await page.getByRole("button", { name: "Start flashcards" }).click();
  const deck = page.getByRole("dialog", { name: "Flashcards" });
  await expect(deck.getByRole("region", { name: "Answer" })).toHaveCount(0);
  await deck.getByRole("button", { name: "Flip card" }).click();
  await expect(deck.getByRole("region", { name: "Answer" })).toBeVisible();
  await deck.getByRole("button", { name: "Rate 3 out of 5" }).click();
  await expect(
    deck.getByRole("heading", { name: concepts.concepts[1]!.label }),
  ).toBeVisible();
});
