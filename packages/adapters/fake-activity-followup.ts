import type {
  ActivityFollowupResponse,
  FollowupContext,
} from "../contracts/activity-followup";

export interface ActivityFollowupProvider {
  readonly metadata?: ActivityFollowupProviderMetadata;
  generate(context: FollowupContext): Promise<unknown>;
}

export interface ActivityFollowupProviderMetadata {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
}

export const activityFollowupProviderMetadata = (
  provider: ActivityFollowupProvider,
): ActivityFollowupProviderMetadata =>
  provider.metadata ?? {
    provider: "fake",
    model: null,
    promptVersion: "injected-fake-v1",
    schemaVersion: 1,
  };

export class FakeActivityFollowupProvider implements ActivityFollowupProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;
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
