import { describe, expect, it } from "vitest";
import { FakeConceptProvider } from "../packages/adapters/fake-concepts";
import {
  type SourceContext,
  validateConceptResult,
  validateSourceContext,
} from "../packages/contracts/concepts";
import { createStudySpaceSchema } from "../packages/contracts/study-spaces";

const source: SourceContext = {
  studySpaceId: "space-a",
  materialId: "material-a",
  chunks: [
    {
      id: "chunk-a",
      studySpaceId: "space-a",
      materialId: "material-a",
      text: "Plants use light energy during photosynthesis.",
    },
  ],
};

describe("versioned contracts and fake concepts", () => {
  it("bounds and trims titles and rejects unknown versions and ownership fields", () => {
    expect(
      createStudySpaceSchema.parse({ schemaVersion: 1, title: " A " }).title,
    ).toBe("A");
    expect(
      createStudySpaceSchema.safeParse({
        schemaVersion: 1,
        title: "a".repeat(120),
      }).success,
    ).toBe(true);
    for (const input of [
      { schemaVersion: 1, title: " " },
      { schemaVersion: 1, title: "a".repeat(121) },
      { schemaVersion: 2, title: "A" },
      { schemaVersion: 1, title: "A", userId: "other-user" },
    ])
      expect(createStudySpaceSchema.safeParse(input).success).toBe(false);
  });

  it("returns bounded source excerpts with stable references", async () => {
    const result = await new FakeConceptProvider().generate(source);
    expect(result.concepts[0]?.sourceIds).toEqual(["chunk-a"]);
    expect(result.concepts[0]?.description).toBe(source.chunks[0]?.text);
    expect(validateConceptResult(result, source)).toEqual(result);
  });

  it("rejects invented references, duplicate concepts and malformed model data", async () => {
    const valid = await new FakeConceptProvider().generate(source);
    const concept = valid.concepts[0]!;
    expect(() =>
      validateConceptResult(
        { ...valid, concepts: [{ ...concept, sourceIds: ["invented"] }] },
        source,
      ),
    ).toThrow();
    expect(() =>
      validateConceptResult({ ...valid, concepts: [concept, concept] }, source),
    ).toThrow();
    expect(() =>
      validateConceptResult({ ...valid, schemaVersion: 2 }, source),
    ).toThrow();
    expect(() =>
      validateConceptResult(
        { ...valid, concepts: [{ ...concept, sourceIds: [] }] },
        source,
      ),
    ).toThrow();
  });

  it("rejects empty evidence and cross-space, cross-material or duplicate chunks", () => {
    const chunk = source.chunks[0]!;
    for (const chunks of [
      [],
      [{ ...chunk, studySpaceId: "other" }],
      [{ ...chunk, materialId: "other" }],
      [chunk, chunk],
    ]) {
      expect(() => validateSourceContext({ ...source, chunks })).toThrow();
    }
  });
});
