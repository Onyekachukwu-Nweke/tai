import { randomUUID } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type EvaluationRecord = {
  provider: "workers_ai";
  model: string;
  task: "concepts" | "activity_pack";
  promptVersion: string;
  schemaVersion: number;
  fixtureId: string;
  sourceIds: readonly string[];
  latencyMs: number;
  httpStatus: number | null;
  outcome: "validated_pending_review" | "rejected";
  errorCategory: string | null;
  schemaValid: boolean;
  sourceIdsValid: boolean;
  validatedItemCount: number;
  validatedItemTypes: string[];
  reportedUsage: Record<string, number> | null;
  usageUnavailableReason: string | null;
  reportedCostUsd: number | null;
  costUnavailableReason: string | null;
};

export type LiveEvaluationReport = {
  reportVersion: 1;
  createdAt: string;
  gatewayId: string;
  manualReview: "pending";
  runPolicy: {
    sequential: true;
    maximumCalls: 4;
    retryCount: 0;
    timeoutMs: 30_000;
    fixtureData: "checked-in synthetic only";
  };
  records: EvaluationRecord[];
};

export function classifyLiveError(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "timeout";
  const message = error instanceof Error ? error.message : "";
  if (/status 401|status 403/.test(message)) return "authentication";
  if (/status 404|model/i.test(message)) return "model_unavailable";
  if (/JSON|parse|schema|Invalid|Duplicate|needs two concepts/.test(message))
    return "validation_rejected";
  if (/fetch|network/i.test(message)) return "network";
  return "provider_error";
}

export async function writeLiveEvaluationReport(
  report: LiveEvaluationReport,
  root = "artifacts/live-evaluation",
): Promise<string> {
  await mkdir(root, { recursive: true });
  const filename = `workers-ai-${report.createdAt.replaceAll(/[:.]/g, "-")}-${randomUUID()}.json`;
  const path = join(root, filename);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await chmod(path, 0o600);
  return path;
}
