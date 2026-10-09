import { describe, expect, it } from "vitest";
import { FakeActivityPackProvider } from "../packages/adapters/fake-activity-packs";
import {
  validateActivityPack,
  type ActivityContext,
} from "../packages/contracts/activity-packs";

const conceptIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];
const source = (id: string, text: string) => ({
  id,
  location: 1,
  start: 0,
  end: text.length,
  text,
});
const shared = source("shared", "Shared excerpt");
const base: ActivityContext = {
  studySpaceId: "33333333-3333-4333-8333-333333333333",
  materialId: "44444444-4444-4444-8444-444444444444",
  conceptRequestId: "55555555-5555-4555-8555-555555555555",
  concepts: conceptIds.map((id, index) => ({
    id,
    label: `Concept ${index + 1}`,
    sources: [shared],
  })),
};

describe("activity-pack contracts", () => {
  it("preserves citation whitespace and validates offsets against exact text", async () => {
    const exact = "  source excerpt  ";
    const context: ActivityContext = {
      ...base,
      concepts: base.concepts.map((concept) => ({
        ...concept,
        sources: [source("whitespace-source", exact)],
      })),
    };
    const pack = await new FakeActivityPackProvider().generate(context);
    const parsed = validateActivityPack(pack, context);
    expect(parsed.questions[0]!.sources[0]).toEqual({
      id: "whitespace-source",
      location: 1,
      start: 0,
      end: exact.length,
      text: exact,
    });
  });

  it("validates option keys, coverage and citation-to-concept membership", async () => {
    const context: ActivityContext = {
      ...base,
      concepts: [
        {
          ...base.concepts[0]!,
          sources: [
            source("source-a", "Alpha excerpt"),
            source("source-b", "Beta excerpt"),
          ],
        },
        {
          ...base.concepts[1]!,
          sources: [source("source-c", "Gamma excerpt")],
        },
      ],
    };
    const valid = await new FakeActivityPackProvider().generate(context);
    const mcq = valid.questions[2]!;
    if (mcq.type !== "mcq") throw new Error("fixture mismatch");
    expect(mcq.options).toHaveLength(3);
    expect(() =>
      validateActivityPack(
        {
          ...valid,
          questions: valid.questions.map((question, index) =>
            index === 2
              ? { ...mcq, correctOptionId: crypto.randomUUID() }
              : question,
          ),
        },
        context,
      ),
    ).toThrow("Invalid MCQ answer");
    const fallback = await new FakeActivityPackProvider().generate(base);
    expect(() =>
      validateActivityPack(
        {
          ...fallback,
          questions: fallback.questions.map((question) => ({
            ...question,
            conceptIds: [conceptIds[0]!],
          })),
        },
        base,
      ),
    ).toThrow("two concepts");
    expect(() =>
      validateActivityPack(
        {
          ...valid,
          questions: valid.questions.map((question, index) =>
            index === 0
              ? { ...question, sources: context.concepts[1]!.sources }
              : question,
          ),
        },
        context,
      ),
    ).toThrow("outside its concepts");
    const scenario = valid.questions.find(
      (question) => question.type === "scenario",
    )!;
    expect(scenario.conceptIds).toHaveLength(2);
    expect(() =>
      validateActivityPack(
        {
          ...valid,
          questions: valid.questions.map((question) =>
            question.id === scenario.id
              ? { ...scenario, assumptions: [] }
              : question,
          ),
        },
        context,
      ),
    ).toThrow();
  });

  it("enforces calculation unit-policy invariants", async () => {
    const quantitative =
      "A cart travels 120 metres in 10 seconds. Speed equals distance divided by time.";
    const context: ActivityContext = {
      ...base,
      concepts: base.concepts.map((concept) => ({
        ...concept,
        sources: [source("motion", quantitative)],
      })),
    };
    const pack = await new FakeActivityPackProvider().generate(context);
    const calculation = pack.questions.find(
      (question) => question.type === "calculation",
    );
    if (!calculation || calculation.type !== "calculation")
      throw new Error("fixture mismatch");
    expect(calculation.numericKey.unitPolicy).toBe("required");
    for (const numericKey of [
      { ...calculation.numericKey, allowedUnits: [] },
      {
        ...calculation.numericKey,
        unitPolicy: "forbidden",
        expectedUnit: "m/s",
        allowedUnits: [],
      },
      {
        ...calculation.numericKey,
        unitPolicy: "optional",
        expectedUnit: null,
      },
    ])
      expect(() =>
        validateActivityPack(
          {
            ...pack,
            questions: pack.questions.map((question) =>
              question.id === calculation.id
                ? { ...calculation, numericKey }
                : question,
            ),
          },
          context,
        ),
      ).toThrow();
  });
});
