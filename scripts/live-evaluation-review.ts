import { randomUUID } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CanonicalActivityPack } from "../packages/contracts/activity-packs";
import type { ConceptDraftResult } from "../packages/contracts/concepts";

export type ReviewEntry = {
  model: string;
  task: "concepts" | "activity_pack";
  status: "pending";
  content: unknown;
};

export type LiveEvaluationReview = {
  reviewVersion: 1;
  createdAt: string;
  fixtureId: string;
  warning: "Synthetic fixture only; complete human source-fidelity and usefulness review";
  entries: ReviewEntry[];
};

export function conceptReviewContent(result: ConceptDraftResult) {
  return {
    concepts: result.concepts.map((concept) => ({
      title: concept.title,
      description: concept.description,
      sourceIds: concept.sourceIds,
    })),
    relations: result.relations,
  };
}

export function activityReviewContent(pack: CanonicalActivityPack) {
  return {
    questions: pack.questions.map(({ sources, ...question }) => ({
      ...question,
      sourceIds: sources.map((source) => source.id),
    })),
  };
}

export async function writeLiveEvaluationReview(
  review: LiveEvaluationReview,
  root = "artifacts/live-evaluation",
): Promise<string> {
  await mkdir(root, { recursive: true });
  const stamp = review.createdAt.replaceAll(/[:.]/g, "-");
  const path = join(root, `workers-ai-review-${stamp}-${randomUUID()}.json`);
  await writeFile(path, `${JSON.stringify(review, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await chmod(path, 0o600);
  return path;
}
