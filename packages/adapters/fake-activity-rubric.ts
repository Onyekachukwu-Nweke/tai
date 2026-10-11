import type {
  ActivityRubricResponse,
  RubricContext,
} from "../contracts/activity-rubric";

export interface ActivityRubricProvider {
  readonly metadata?: ActivityRubricProviderMetadata;
  grade(context: RubricContext): Promise<unknown>;
}

export interface ActivityRubricProviderMetadata {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
}

export const activityRubricProviderMetadata = (
  provider: ActivityRubricProvider,
): ActivityRubricProviderMetadata =>
  provider.metadata ?? {
    provider: "fake",
    model: null,
    promptVersion: "injected-fake-v1",
    schemaVersion: 1,
  };

export class FakeActivityRubricProvider implements ActivityRubricProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;

  async grade(context: RubricContext): Promise<ActivityRubricResponse> {
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      outcome: "uncertain",
      feedback:
        "This deterministic development provider cannot judge meaning reliably. Compare each point with the cited material.",
      elements: context.rubric.map((criterion) => ({
        criterion,
        outcome: "uncertain" as const,
        feedback: "Review this point against the cited section.",
      })),
      sources: [context.sources[0]!],
    };
  }
}
