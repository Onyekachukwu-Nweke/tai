import type {
  PracticalContext,
  PracticalTaskDraft,
} from "../contracts/practical-tasks";

export interface PracticalTaskProvider {
  readonly metadata?: PracticalTaskProviderMetadata;
  generate(context: PracticalContext): Promise<unknown>;
}
export interface PracticalTaskProviderMetadata {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
}
export const practicalTaskProviderMetadata = (
  provider: PracticalTaskProvider,
): PracticalTaskProviderMetadata =>
  provider.metadata ?? {
    provider: "fake",
    model: null,
    promptVersion: "injected-fake-v1",
    schemaVersion: 1,
  };
const variant = (label: string, minutes: number) => ({
  modality: "written_analysis" as const,
  objective: `Demonstrate ${label} using a written desk-based example.`,
  instructions: [
    "Choose one claim from the cited source.",
    "Create a short example that demonstrates the claim.",
    "Compare the example with the cited wording.",
  ],
  expectedOutput: "A short written example and a two-sentence comparison.",
  requiredTools: ["paper" as const, "pen" as const],
  estimatedMinutes: minutes,
  selfCheck: [
    "The example uses the cited claim.",
    "The comparison identifies one match with the source.",
  ],
  connectivity: {
    requirement: "none" as const,
    disclosure: "No internet connection is needed.",
  },
  cost: { kind: "none" as const },
});
export class FakePracticalTaskProvider implements PracticalTaskProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;
  async generate(context: PracticalContext): Promise<PracticalTaskDraft> {
    const first = context.concepts[0]!;
    return {
      schemaVersion: 1,
      suitable: true,
      reason: "The selected source supports a safe written application.",
      conceptIds: [first.id],
      sourceIds: [
        ...new Set(
          context.concepts.flatMap((concept) =>
            concept.sources.map((source) => source.id),
          ),
        ),
      ],
      task: variant(first.label, 15),
      simpler: variant(first.label, 5),
      freeAlternative: variant(first.label, 10),
    };
  }
}
