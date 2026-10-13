import { expect, test } from "vitest";
import { readLiveEvaluationConfig } from "./live-evaluation-config";
import { runLiveEvaluation } from "./live-evaluation";
import { writeLiveEvaluationReport } from "./live-evaluation-report";
import { writeLiveEvaluationReview } from "./live-evaluation-review";
import { CloudflareRestAiRunner } from "./live-evaluation-transport";

test("runs the explicitly authorized bounded live Workers AI evaluation", async () => {
  const config = readLiveEvaluationConfig(process.env);
  const runner = new CloudflareRestAiRunner(config);
  const { report, review } = await runLiveEvaluation(config, runner);
  expect(report.records).toHaveLength(4);
  const path = await writeLiveEvaluationReport(report);
  const reviewPath = await writeLiveEvaluationReview(review);
  const validated = report.records.filter(
    (record) => record.outcome === "validated_pending_review",
  ).length;
  console.log(`Sanitized live-evaluation report: ${path}`);
  console.log(`Owner-only manual-review artifact: ${reviewPath}`);
  console.log(
    `Validated tasks pending human review: ${validated}/${report.records.length}`,
  );
}, 140_000);
