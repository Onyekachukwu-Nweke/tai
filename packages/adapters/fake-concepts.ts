import {
  type ConceptDraftResult,
  type SourceContext,
  validateConceptDrafts,
  validateSourceContext,
} from "../contracts/concepts";
export interface ConceptProvider {
  metadata?: ConceptProviderMetadata;
  generate(context: SourceContext): Promise<ConceptDraftResult>;
}
export type ConceptProviderMetadata = {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
};
export function conceptProviderMetadata(
  provider: ConceptProvider,
): ConceptProviderMetadata {
  return (
    provider.metadata ?? {
      provider: "fake",
      model: null,
      promptVersion: "injected-fake-v1",
      schemaVersion: 1,
    }
  );
}
// Deterministic development provider: demonstrates traceability, not educational quality.
export class FakeConceptProvider implements ConceptProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;
  async generate(input: SourceContext): Promise<ConceptDraftResult> {
    const context = validateSourceContext(input);
    const concepts = context.chunks.slice(0, 5).map((chunk, index) => ({
      title: `Source concept ${index + 1}`,
      description: chunk.text.slice(0, 2_000),
      sourceIds: [chunk.id],
    }));
    return validateConceptDrafts(
      {
        schemaVersion: 1,
        concepts,
        relations: concepts.slice(1).map((_, index) => ({
          from: index,
          to: index + 1,
          kind: "suggested" as const,
        })),
      },
      context,
    );
  }
}
