import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadDraft } from "../apps/web/src/activity-drafts";

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

describe("activity draft identity", () => {
  it("rotates a legacy attempt ID when a question enters a study session", () => {
    const prefix = "tai:activity-draft:user:space:pack:question";
    values.set(
      prefix,
      JSON.stringify({
        attemptId: "prior-attempt",
        answer: "Answer retained after a dropped response",
        selectedOptionId: "",
        confidence: "medium",
      }),
    );

    const first = loadDraft(
      "user",
      "space",
      "pack",
      "question",
      "recovery-session",
    ).draft;
    const retry = loadDraft(
      "user",
      "space",
      "pack",
      "question",
      "recovery-session",
    ).draft;

    expect(first.answer).toBe("Answer retained after a dropped response");
    expect(first.attemptId).not.toBe("prior-attempt");
    expect(retry.attemptId).toBe(first.attemptId);
    expect(values.has(prefix)).toBe(false);
  });
});
