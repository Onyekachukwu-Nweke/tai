import type {
  ActivityContext,
  CanonicalActivityPack,
} from "../contracts/activity-packs";

export interface ActivityPackProvider {
  metadata?: ActivityPackProviderMetadata;
  generate(context: ActivityContext): Promise<unknown>;
}
export type ActivityPackProviderMetadata = {
  provider: "fake" | "workers_ai";
  model: string | null;
  promptVersion: string;
  schemaVersion: 1;
};
export function activityPackProviderMetadata(
  provider: ActivityPackProvider,
): ActivityPackProviderMetadata {
  return (
    provider.metadata ?? {
      provider: "fake",
      model: null,
      promptVersion: "injected-fake-v1",
      schemaVersion: 1,
    }
  );
}
const questionId = (index: number) =>
  `10000000-0000-4000-8000-00000000000${index}`;
const optionId = (index: number) =>
  `20000000-0000-4000-8000-00000000000${index}`;

export class FakeActivityPackProvider implements ActivityPackProvider {
  readonly metadata = {
    provider: "fake",
    model: null,
    promptVersion: "deterministic-fake-v1",
    schemaVersion: 1,
  } as const;
  async generate(context: ActivityContext): Promise<CanonicalActivityPack> {
    const [first, second] = context.concepts;
    if (!first || !second) throw new Error("Insufficient selected concepts");
    const firstSource = first.sources[0]!,
      secondSource = second.sources[0]!;
    const distinctSources = context.concepts
      .flatMap((concept) =>
        concept.sources.map((item) => ({ conceptId: concept.id, item })),
      )
      .filter(
        (entry, index, entries) =>
          entries.findIndex((other) => other.item.id === entry.item.id) ===
          index,
      );
    const third =
      distinctSources.length >= 3
        ? {
            id: questionId(3),
            type: "mcq" as const,
            conceptIds: [
              ...new Set(
                distinctSources.slice(0, 3).map((entry) => entry.conceptId),
              ),
            ],
            prompt: "Which excerpt is cited for the first selected concept?",
            estimatedMinutes: 1,
            sources: distinctSources.slice(0, 3).map((entry) => entry.item),
            options: distinctSources.slice(0, 3).map((entry, index) => ({
              id: optionId(index + 1),
              text: entry.item.text,
            })),
            correctOptionId: optionId(1),
            answerExplanation: "The first option is the exact cited excerpt.",
          }
        : {
            id: questionId(3),
            type: "explain" as const,
            conceptIds: [first.id, second.id],
            prompt: `Explain one source-supported connection between ${first.label} and ${second.label}.`,
            estimatedMinutes: 3,
            sources:
              firstSource.id === secondSource.id
                ? [firstSource]
                : [firstSource, secondSource],
            rubric: [
              "Uses the cited excerpts without adding an unsupported claim.",
            ],
          };
    const scenarioSources =
      firstSource.id === secondSource.id
        ? [firstSource]
        : [firstSource, secondSource];
    const quantitative = context.concepts
      .flatMap((concept) => concept.sources.map((item) => ({ concept, item })))
      .find(({ item }) =>
        item.text.includes(
          "A cart travels 120 metres in 10 seconds. Speed equals distance divided by time.",
        ),
      );
    return {
      schemaVersion: 1,
      questions: [
        {
          id: questionId(1),
          type: "recall",
          conceptIds: [first.id],
          prompt: `Recall one source-supported point about ${first.label}.`,
          estimatedMinutes: 2,
          sources: [firstSource],
          supportedAnswer: firstSource.text,
        },
        {
          id: questionId(2),
          type: "explain",
          conceptIds: [second.id],
          prompt: `Explain ${second.label} using the cited excerpt.`,
          estimatedMinutes: 3,
          sources: [secondSource],
          rubric: [`Uses the cited point: ${secondSource.text}`],
        },
        third,
        {
          id: questionId(4),
          type: "scenario",
          conceptIds: [first.id, second.id],
          prompt: `A classmate understands ${first.label} but is unsure how it affects ${second.label} during a practice task. Describe what you would tell them using the cited material.`,
          assumptions: [
            "Use only the supplied situation and cited excerpts.",
            "State when the material does not support a needed detail.",
          ],
          estimatedMinutes: 4,
          sources: scenarioSources,
          rubric: [
            `Applies the cited point about ${first.label}.`,
            `Connects the response to ${second.label} without an unsupported claim.`,
          ],
        },
        ...(quantitative
          ? [
              {
                id: questionId(5),
                type: "calculation" as const,
                conceptIds: [quantitative.concept.id],
                prompt:
                  "Calculate the cart's speed. Give one number with a unit and show your working.",
                notation: String.raw`v = \frac{d}{t}`,
                givens: ["Distance d = 120 m", "Time t = 10 s"],
                estimatedMinutes: 4,
                sources: [quantitative.item],
                numericKey: {
                  unitPolicy: "required" as const,
                  expectedValue: 12,
                  expectedUnit: "m/s" as const,
                  allowedUnits: ["m/s" as const, "km/h" as const],
                  absoluteTolerance: 0.01,
                  relativeTolerance: 0.001,
                },
                workedExplanation: "Divide 120 m by 10 s to obtain 12 m/s.",
                rubric: [
                  "Uses speed equals distance divided by time.",
                  "Substitutes 120 m and 10 s consistently.",
                ],
              },
            ]
          : []),
      ],
    };
  }
}
