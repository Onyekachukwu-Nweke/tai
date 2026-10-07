import {
  type ConceptResult,
  type SourceContext,
  validateConceptResult,
  validateSourceContext,
} from "../contracts/concepts";

export interface ConceptProvider {
  generate(context: SourceContext): Promise<ConceptResult>;
}

// Development fixture only: excerpts demonstrate traceability, not teaching quality.
export class FakeConceptProvider implements ConceptProvider {
  async generate(input: SourceContext): Promise<ConceptResult> {
    const context = validateSourceContext(input);
    const result = {
      schemaVersion: 1,
      concepts: context.chunks.slice(0, 5).map((chunk, index) => ({
        id: `fake-concept-${index + 1}`,
        title: `Source excerpt ${index + 1}`,
        description: chunk.text.slice(0, 2000),
        sourceIds: [chunk.id],
      })),
    };
    return validateConceptResult(result, context);
  }
}
