export type ActivityDraft = {
  attemptId: string;
  answer: string;
  selectedOptionId: string;
  confidence: "" | "low" | "medium" | "high";
};
const key = (
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
) => `tai:activity-draft:${userId}:${spaceId}:${packId}:${questionId}`;
const warning =
  "This browser could not persist your draft. Keep this tab open until the response is saved.";
export function loadDraft(
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
): { draft: ActivityDraft; warning: string } {
  try {
    const raw = localStorage.getItem(key(userId, spaceId, packId, questionId));
    if (raw) {
      const value = JSON.parse(raw) as Partial<ActivityDraft>;
      if (
        typeof value.attemptId === "string" &&
        typeof value.answer === "string" &&
        typeof value.selectedOptionId === "string" &&
        ["", "low", "medium", "high"].includes(value.confidence ?? "")
      )
        return { draft: value as ActivityDraft, warning: "" };
    }
  } catch {
    return { draft: fresh(), warning };
  }
  return { draft: fresh(), warning: "" };
}
function fresh(): ActivityDraft {
  return {
    attemptId: crypto.randomUUID(),
    answer: "",
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
) {
  try {
    localStorage.setItem(
      key(userId, spaceId, packId, questionId),
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
) {
  try {
    localStorage.removeItem(key(userId, spaceId, packId, questionId));
    return "";
  } catch {
    return warning;
  }
}
