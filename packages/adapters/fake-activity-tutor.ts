import type {
  ActivityTutorResponse,
  TutorContext,
} from "../contracts/activity-tutor";

export interface ActivityTutorProvider {
  generate(context: TutorContext): Promise<unknown>;
}

export class FakeActivityTutorProvider implements ActivityTutorProvider {
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
          : `Reframe the question in your own words, then connect each part of your response to the cited section ${source.location}.`,
      sources: [source],
      supportedByMaterial: true,
    };
  }
}
