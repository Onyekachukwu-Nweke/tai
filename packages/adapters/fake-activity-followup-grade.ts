import type {
  FollowupGradeContext,
  FollowupGradeResponse,
} from "../contracts/activity-followup-grade";

export interface ActivityFollowupGradeProvider {
  grade(context: FollowupGradeContext): Promise<unknown>;
}

export class FakeActivityFollowupGradeProvider implements ActivityFollowupGradeProvider {
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
