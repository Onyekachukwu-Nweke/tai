import { describe, expect, it } from "vitest";
import { validateSourceContext } from "../packages/contracts/concepts";
import { practicalContextSchema } from "../packages/contracts/practical-tasks";

const studySpaceId = "11111111-1111-4111-8111-111111111111";
const materialId = "22222222-2222-4222-8222-222222222222";
// A 2,000-character chunk boundary can land on whitespace.
const edged = " Plants use light energy.\n";
const chunk = (text: string, start = 2000) => ({
  id: `${materialId}:4:${start}`,
  studySpaceId,
  materialId,
  location: 4,
  start,
  end: start + text.length,
  text,
});
const conceptContext = (text: string, end?: number) => ({
  studySpaceId,
  materialId,
  startLocation: 1,
  endLocation: 9,
  chunks: [{ ...chunk(text), ...(end ? { end } : {}) }],
});
const practicalContext = (text: string) => ({
  studySpaceId,
  materialId,
  conceptRequestId: "33333333-3333-4333-8333-333333333333",
  concepts: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      label: "Light",
      sources: [
        {
          id: chunk(text).id,
          location: 4,
          start: 2000,
          end: 2000 + text.length,
          text,
        },
      ],
    },
  ],
});

describe("source text at chunk boundaries", () => {
  it("keeps exact whitespace-edged concept sources and their offsets", () => {
    const context = validateSourceContext(conceptContext(edged));
    expect(context.chunks[0]!.text).toBe(edged);
  });

  it("still rejects blank text and offsets that do not match the text", () => {
    expect(() => validateSourceContext(conceptContext(" \n\t "))).toThrow();
    expect(() =>
      validateSourceContext(conceptContext(edged, 2000 + edged.trim().length)),
    ).toThrow();
  });

  it("accepts whitespace-edged practical-task sources unchanged", () => {
    const parsed = practicalContextSchema.parse(practicalContext(edged));
    expect(parsed.concepts[0]!.sources[0]!.text).toBe(edged);
    expect(
      practicalContextSchema.safeParse(practicalContext("   ")).success,
    ).toBe(false);
  });
});
