import { WorkersAiActivityPackProvider } from "../packages/adapters/workers-ai-activity-packs";
import { WorkersAiConceptProvider } from "../packages/adapters/workers-ai-concepts";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import type { LiveEvaluationConfig } from "./live-evaluation-config";
import {
  liveActivityFixture,
  liveConceptFixture,
  liveFixtureMetadata,
} from "./live-evaluation-fixtures";
import {
  classifyLiveError,
  type EvaluationRecord,
  type LiveEvaluationReport,
} from "./live-evaluation-report";
import {
  activityReviewContent,
  conceptReviewContent,
  type LiveEvaluationReview,
  type ReviewEntry,
} from "./live-evaluation-review";
import type { CallObservation } from "./live-evaluation-transport";

type ObservableRunner = WorkersAiRunner & {
  observations: CallObservation[];
};

function baseRecord(
  model: string,
  task: EvaluationRecord["task"],
  metadata: { promptVersion: string; schemaVersion: number },
  observation: CallObservation | undefined,
): Omit<
  EvaluationRecord,
  | "outcome"
  | "errorCategory"
  | "schemaValid"
  | "sourceIdsValid"
  | "validatedItemCount"
  | "validatedItemTypes"
> {
  return {
    provider: "workers_ai",
    model,
    task,
    promptVersion: metadata.promptVersion,
    schemaVersion: metadata.schemaVersion,
    fixtureId: liveFixtureMetadata.fixtureId,
    sourceIds: liveFixtureMetadata.sourceIds,
    latencyMs: observation?.latencyMs ?? 0,
    httpStatus: observation?.httpStatus ?? null,
    reportedUsage: observation?.usage ?? null,
    usageUnavailableReason: observation?.usage
      ? null
      : "Provider response did not include numeric usage fields",
    reportedCostUsd: observation?.reportedCostUsd ?? null,
    costUnavailableReason:
      observation && observation.reportedCostUsd !== null
        ? null
        : "The provider response did not report cost; no unverified rate estimate was applied",
  };
}

async function evaluateTask(
  runner: ObservableRunner,
  model: string,
  task: EvaluationRecord["task"],
): Promise<{ record: EvaluationRecord; review: ReviewEntry | null }> {
  const before = runner.observations.length;
  const provider =
    task === "concepts"
      ? new WorkersAiConceptProvider(runner, {
          model,
          gatewayId: "injected-by-transport",
        })
      : new WorkersAiActivityPackProvider(runner, {
          model,
          gatewayId: "injected-by-transport",
        });
  try {
    const output =
      task === "concepts"
        ? await (provider as WorkersAiConceptProvider).generate(
            liveConceptFixture,
          )
        : await (provider as WorkersAiActivityPackProvider).generate(
            liveActivityFixture,
          );
    const items =
      task === "concepts"
        ? (output as Awaited<ReturnType<WorkersAiConceptProvider["generate"]>>)
            .concepts
        : (
            output as Awaited<
              ReturnType<WorkersAiActivityPackProvider["generate"]>
            >
          ).questions;
    return {
      record: {
        ...baseRecord(
          model,
          task,
          provider.metadata,
          runner.observations[before],
        ),
        outcome: "validated_pending_review",
        errorCategory: null,
        schemaValid: true,
        sourceIdsValid: true,
        validatedItemCount: items.length,
        validatedItemTypes:
          task === "concepts"
            ? ["concept"]
            : [
                ...new Set(
                  (
                    output as Awaited<
                      ReturnType<WorkersAiActivityPackProvider["generate"]>
                    >
                  ).questions.map((item) => item.type),
                ),
              ].sort(),
      },
      review: {
        model,
        task,
        status: "pending",
        content:
          task === "concepts"
            ? conceptReviewContent(
                output as Awaited<
                  ReturnType<WorkersAiConceptProvider["generate"]>
                >,
              )
            : activityReviewContent(
                output as Awaited<
                  ReturnType<WorkersAiActivityPackProvider["generate"]>
                >,
              ),
      },
    };
  } catch (error) {
    return {
      record: {
        ...baseRecord(
          model,
          task,
          provider.metadata,
          runner.observations[before],
        ),
        outcome: "rejected",
        errorCategory: classifyLiveError(error),
        schemaValid: false,
        sourceIdsValid: false,
        validatedItemCount: 0,
        validatedItemTypes: [],
      },
      review: null,
    };
  }
}

export async function runLiveEvaluation(
  config: LiveEvaluationConfig,
  runner: ObservableRunner,
  now = new Date(),
): Promise<{ report: LiveEvaluationReport; review: LiveEvaluationReview }> {
  const records: EvaluationRecord[] = [];
  const entries: ReviewEntry[] = [];
  for (const model of config.models) {
    for (const task of ["concepts", "activity_pack"] as const) {
      const result = await evaluateTask(runner, model, task);
      records.push(result.record);
      if (result.review) entries.push(result.review);
    }
  }
  return {
    report: {
      reportVersion: 1,
      createdAt: now.toISOString(),
      gatewayId: config.gatewayId,
      manualReview: "pending",
      runPolicy: {
        sequential: true,
        maximumCalls: 4,
        retryCount: 0,
        timeoutMs: 30_000,
        fixtureData: "checked-in synthetic only",
      },
      records,
    },
    review: {
      reviewVersion: 1,
      createdAt: now.toISOString(),
      fixtureId: liveFixtureMetadata.fixtureId,
      warning:
        "Synthetic fixture only; complete human source-fidelity and usefulness review",
      entries,
    },
  };
}
