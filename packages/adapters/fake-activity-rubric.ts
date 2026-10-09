import type {
  ActivityRubricResponse,
  RubricContext,
} from "../contracts/activity-rubric";

export interface ActivityRubricProvider {
  grade(context: RubricContext): Promise<unknown>;
}

export class FakeActivityRubricProvider implements ActivityRubricProvider {
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
