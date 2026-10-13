import type {
  ActivityTutorResponse,
  TutorContext,
} from "../contracts/activity-tutor";

export interface ActivityTutorProvider {
  metadata?: ActivityTutorProviderMetadata;
  generate(context: TutorContext): Promise<unknown>;
}

export type ActivityTutorProviderMetadata = {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
};

export function activityTutorProviderMetadata(
  provider: ActivityTutorProvider,
): ActivityTutorProviderMetadata {
  return (
    provider.metadata ?? {
      provider: "fake",
      model: null,
      promptVersion: "injected-fake-v1",
      schemaVersion: 1,
    }
  );
}

export class FakeActivityTutorProvider implements ActivityTutorProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;

  async generate(context: TutorContext): Promise<ActivityTutorResponse> {
    const source = context.question.sources[0]!;
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      packId: context.packId,
      questionId: context.questionId,
      kind: context.kind,
      text:
        context.kind === "hint"
          ? `Use the cited section ${source.location} to identify the key relationship before choosing or writing your answer.`
          : `Use shorter sentences to restate the idea from section ${source.location}. Keep its terminology, symbols, numbers, and units unchanged.`,
      sources: [source],
      supportedByMaterial: true,
    };
  }
}
