export type ActivityDraft = {
  attemptId: string;
  answer: string;
  finalAnswer: string;
  selectedOptionId: string;
  confidence: "" | "low" | "medium" | "high";
};
const key = (
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
  studySessionId?: string,
) =>
  `tai:activity-draft:${userId}:${spaceId}:${packId}:${questionId}${studySessionId ? `:session:${studySessionId}` : ""}`;
const warning =
  "This browser could not persist your draft. Keep this tab open until the response is saved.";
export function loadDraft(
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
  studySessionId?: string,
): { draft: ActivityDraft; warning: string } {
  try {
    const draftKey = key(userId, spaceId, packId, questionId, studySessionId);
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      const value = validDraft(raw);
      if (value) return { draft: value, warning: "" };
    }
    if (studySessionId) {
      const legacyKey = key(userId, spaceId, packId, questionId);
      const legacy = localStorage.getItem(legacyKey);
      const value = legacy ? validDraft(legacy) : null;
      if (value) {
        const migrated = { ...value, attemptId: crypto.randomUUID() };
        localStorage.setItem(draftKey, JSON.stringify(migrated));
        localStorage.removeItem(legacyKey);
        return { draft: migrated, warning: "" };
      }
    }
  } catch {
    return { draft: fresh(), warning };
  }
  return { draft: fresh(), warning: "" };
}
function validDraft(raw: string): ActivityDraft | null {
  const value = JSON.parse(raw) as Partial<ActivityDraft>;
  return typeof value.attemptId === "string" &&
    typeof value.answer === "string" &&
    typeof (value.finalAnswer ?? "") === "string" &&
    typeof value.selectedOptionId === "string" &&
    ["", "low", "medium", "high"].includes(value.confidence ?? "")
    ? ({ ...value, finalAnswer: value.finalAnswer ?? "" } as ActivityDraft)
    : null;
}
function fresh(): ActivityDraft {
  return {
    attemptId: crypto.randomUUID(),
    answer: "",
    finalAnswer: "",
    selectedOptionId: "",
    confidence: "",
  };
}
export function saveDraft(
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
  draft: ActivityDraft,
  studySessionId?: string,
) {
  try {
    localStorage.setItem(
      key(userId, spaceId, packId, questionId, studySessionId),
      JSON.stringify(draft),
    );
    return "";
  } catch {
    return warning;
  }
}
export function clearDraft(
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
  studySessionId?: string,
) {
  try {
    localStorage.removeItem(
      key(userId, spaceId, packId, questionId, studySessionId),
    );
    return "";
  } catch {
    return warning;
  }
}

export function clearUserDrafts(userId: string) {
  const prefix = `tai:activity-draft:${userId}:`;
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((draftKey): draftKey is string =>
      Boolean(draftKey?.startsWith(prefix)),
    );
    keys.forEach((draftKey) => localStorage.removeItem(draftKey));
    return "";
  } catch {
    return "TAI could not clear this account’s activity drafts from this browser.";
  }
}
