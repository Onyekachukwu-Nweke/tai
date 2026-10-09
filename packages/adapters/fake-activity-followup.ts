import type {
  ActivityFollowupResponse,
  FollowupContext,
} from "../contracts/activity-followup";

export interface ActivityFollowupProvider {
  generate(context: FollowupContext): Promise<unknown>;
}

export class FakeActivityFollowupProvider implements ActivityFollowupProvider {
  async generate(context: FollowupContext): Promise<ActivityFollowupResponse> {
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      targetedCriterion: context.targetedCriterion,
      gapOutcome: context.gapOutcome,
      conceptIds: context.conceptIds,
      prompt: `Using the cited section, explain this point more precisely: ${context.targetedCriterion}`,
      sources: [context.sources[0]!],
    };
  }
}
