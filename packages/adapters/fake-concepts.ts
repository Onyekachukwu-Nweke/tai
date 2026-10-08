import {
  type ConceptDraftResult,
  type SourceContext,
  validateConceptDrafts,
  validateSourceContext,
} from "../contracts/concepts";
export interface ConceptProvider {
  generate(context: SourceContext): Promise<ConceptDraftResult>;
}
// Deterministic development provider: demonstrates traceability, not educational quality.
export class FakeConceptProvider implements ConceptProvider {
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
