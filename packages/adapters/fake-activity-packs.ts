import type {
  ActivityContext,
  CanonicalActivityPack,
} from "../contracts/activity-packs";

export interface ActivityPackProvider {
  generate(context: ActivityContext): Promise<unknown>;
}
const questionId = (index: number) =>
  `10000000-0000-4000-8000-00000000000${index}`;
const optionId = (index: number) =>
  `20000000-0000-4000-8000-00000000000${index}`;

export class FakeActivityPackProvider implements ActivityPackProvider {
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
      ],
    };
  }
}
