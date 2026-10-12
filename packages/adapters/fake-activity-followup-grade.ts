import type {
  FollowupGradeContext,
  FollowupGradeResponse,
} from "../contracts/activity-followup-grade";

export interface ActivityFollowupGradeProvider {
  readonly metadata?: ActivityFollowupGradeProviderMetadata;
  grade(context: FollowupGradeContext): Promise<unknown>;
}

export interface ActivityFollowupGradeProviderMetadata {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
}

export const activityFollowupGradeProviderMetadata = (
  provider: ActivityFollowupGradeProvider,
): ActivityFollowupGradeProviderMetadata =>
  provider.metadata ?? {
    provider: "fake",
    model: null,
    promptVersion: "injected-fake-v1",
    schemaVersion: 1,
  };

export class FakeActivityFollowupGradeProvider implements ActivityFollowupGradeProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;
  async grade(context: FollowupGradeContext): Promise<FollowupGradeResponse> {
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      followupRequestId: context.followupRequestId,
      packId: context.packId,
      questionId: context.questionId,
      targetedCriterion: context.targetedCriterion,
      outcome: "uncertain",
      feedback:
        "This deterministic development provider cannot judge meaning reliably. Compare your response with the cited material.",
      sources: [context.sources[0]!],
    };
  }
}
