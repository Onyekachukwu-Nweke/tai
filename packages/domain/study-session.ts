export type SessionMode = "learn" | "review" | "practise";
export type SessionCandidate = {
  questionId: string;
  conceptIds: string[];
  estimatedMinutes: number;
  completed: boolean;
  flagged: boolean;
  labels: string[];
};

const priority = (candidate: SessionCandidate, mode: SessionMode) => {
  const due = candidate.labels.includes("Review due");
  const needs = candidate.labels.includes("Needs practice");
  const newConcept = candidate.labels.includes("Not checked");
  if (due) return 0;
  if (mode === "practise" && needs) return 1;
  if (mode === "learn" && newConcept) return 1;
  if (mode === "review" && !newConcept) return 1;
  return 2;
};

export function selectSessionItems(
  candidates: SessionCandidate[],
  budgetMinutes: 5 | 15 | 30,
  mode: SessionMode,
  conceptId?: string,
) {
  const available = candidates.filter(
    (item) =>
      !item.completed &&
      !item.flagged &&
      (!conceptId || item.conceptIds.includes(conceptId)),
  );
  const ordered = available
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        priority(a.item, mode) - priority(b.item, mode) || a.index - b.index,
    );
  const selected: SessionCandidate[] = [];
  let used = 0;
  while (ordered.length) {
    if (selected.length) {
      const focus = new Set(
        selected
          .filter(
            (item) =>
              item.labels.includes("Review due") ||
              item.labels.includes("Needs practice"),
          )
          .flatMap((item) => item.conceptIds),
      );
      ordered.sort(
        (a, b) =>
          Number(!a.item.conceptIds.some((id) => focus.has(id))) -
            Number(!b.item.conceptIds.some((id) => focus.has(id))) ||
          priority(a.item, mode) - priority(b.item, mode) ||
          a.index - b.index,
      );
    }
    const entry = ordered.shift()!;
    if (used + entry.item.estimatedMinutes > budgetMinutes) continue;
    selected.push(entry.item);
    used += entry.item.estimatedMinutes;
  }
  return { items: selected, estimatedMinutes: used };
}

export function sessionReason(
  item: SessionCandidate,
  mode: SessionMode,
  conceptOverride: boolean,
) {
  if (conceptOverride) return "You asked to work on this concept.";
  if (item.labels.includes("Review due"))
    return "This concept is due for a review check.";
  if (mode === "practise") return "You asked for more practice.";
  if (mode === "review") return "You asked to review recent learning.";
  return "You asked to learn from your current material.";
}

const recoveryPriority = (item: SessionCandidate) =>
  item.labels.includes("Review due")
    ? 0
    : item.labels.includes("Needs practice")
      ? 1
      : 2;

export function selectRecoveryItems(candidates: SessionCandidate[]) {
  const ordered = candidates
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        !item.flagged &&
        !item.labels.includes("Recall successful") &&
        item.labels.some((label) =>
          ["Review due", "Needs practice", "Not checked"].includes(label),
        ),
    )
    .sort(
      (a, b) =>
        recoveryPriority(a.item) - recoveryPriority(b.item) ||
        a.index - b.index,
    );
  const selected: SessionCandidate[] = [];
  let estimatedMinutes = 0;
  while (ordered.length && selected.length < 3) {
    if (selected.length) {
      const focus = new Set(selected.at(-1)!.conceptIds);
      ordered.sort(
        (a, b) =>
          Number(!a.item.conceptIds.some((id) => focus.has(id))) -
            Number(!b.item.conceptIds.some((id) => focus.has(id))) ||
          recoveryPriority(a.item) - recoveryPriority(b.item) ||
          a.index - b.index,
      );
    }
    const next = ordered.shift()!.item;
    if (estimatedMinutes + next.estimatedMinutes > 10) continue;
    selected.push(next);
    estimatedMinutes += next.estimatedMinutes;
  }
  return { items: selected, estimatedMinutes };
}

export const recoveryReason = (item: SessionCandidate) =>
  item.labels.includes("Review due")
    ? "This concept is due for a review check."
    : item.labels.includes("Needs practice")
      ? "A recent check suggests another short practice."
      : "This concept has not been checked yet.";
