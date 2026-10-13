import { describe, expect, it } from "vitest";
import { FakeActivityTutorProvider } from "../packages/adapters/fake-activity-tutor";
import {
  validateTutorResponse,
  type TutorContext,
} from "../packages/contracts/activity-tutor";

describe("fake activity tutor", () => {
  it("keeps both kinds bounded without echoing a maximum-length source", async () => {
    const text = "source answer ".repeat(923).slice(0, 12_000);
    const context: TutorContext = {
      requestId: "10000000-0000-4000-8000-000000000001",
      packId: "10000000-0000-4000-8000-000000000002",
      questionId: "10000000-0000-4000-8000-000000000003",
      kind: "hint",
      question: {
        type: "recall",
        prompt: "Recall the source.",
        conceptIds: [],
        sources: [
          { id: "source", location: 1, start: 0, end: text.length, text },
        ],
      },
    };
    const provider = new FakeActivityTutorProvider();
    for (const kind of ["hint", "explain_again"] as const) {
      const scoped = { ...context, kind };
      const response = validateTutorResponse(
        await provider.generate(scoped),
        scoped,
      );
      expect(response.text.length).toBeLessThanOrEqual(
        kind === "hint" ? 600 : 1_200,
      );
      expect(response.text).not.toContain(text);
      expect(response.text).not.toBe(text);
      if (kind === "explain_again") {
        expect(response.text).toContain("shorter sentences");
        expect(response.text).toContain(
          "terminology, symbols, numbers, and units",
        );
      }
    }
  });
});
