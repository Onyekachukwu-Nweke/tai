export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export type ProgressEvidence = {
  correctness: "correct" | "incorrect";
  createdAt: string;
};

const DAY = 86_400_000;
const intervals = [1, 3, 7, 14] as const;

export function projectEvidence(evidence: ProgressEvidence[]) {
  let step = 0;
  for (const item of evidence) {
    step = item.correctness === "correct" ? Math.min(step + 1, 4) : 0;
  }
  const latest = evidence.at(-1);
  if (!latest) return null;
  const days = latest.correctness === "incorrect" ? 1 : intervals[step - 1]!;
  return {
    reviewStep: step,
    latestCorrectness: latest.correctness,
    lastCheckedAt: latest.createdAt,
    nextReviewAt: new Date(
      Date.parse(latest.createdAt) + days * DAY,
    ).toISOString(),
  };
}

export function evidenceLabel(
  progress: ReturnType<typeof projectEvidence>,
  asOf: Date,
) {
  if (!progress) return "Not checked" as const;
  if (progress.latestCorrectness === "incorrect")
    return "Needs practice" as const;
  return asOf.getTime() >= Date.parse(progress.nextReviewAt)
    ? ("Review due" as const)
    : ("Recall successful" as const);
}
