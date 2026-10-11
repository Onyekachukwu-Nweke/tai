import { describe, expect, it } from "vitest";
import { FakePracticalTaskProvider } from "../packages/adapters/fake-practical-tasks";
import {
  practicalTaskDraftSchema,
  type PracticalContext,
} from "../packages/contracts/practical-tasks";
import { assertSafePracticalTask } from "../apps/worker/src/practical-task-safety";

const context: PracticalContext = {
  studySpaceId: "10000000-0000-4000-8000-000000000001",
  materialId: "10000000-0000-4000-8000-000000000002",
  conceptRequestId: "10000000-0000-4000-8000-000000000003",
  concepts: [
    {
      id: "10000000-0000-4000-8000-000000000004",
      label: "Synthetic concept",
      sources: [
        {
          id: "source-1",
          location: 1,
          start: 0,
          end: 16,
          text: "Synthetic source",
        },
      ],
    },
  ],
};

describe("practical task deterministic safety", () => {
  it("rejects non-allowlisted tools and exact physical bypass prose", async () => {
    const draft = await new FakePracticalTaskProvider().generate(context);
    expect(() =>
      practicalTaskDraftSchema.parse({
        ...draft,
        task: { ...draft.task!, requiredTools: ["saw", "ladder"] },
      }),
    ).toThrow();
    const parsed = practicalTaskDraftSchema.parse({
      ...draft,
      task: {
        ...draft.task!,
        instructions: ["Use a saw to cut timber on a roof."],
      },
    });
    expect(() => assertSafePracticalTask(parsed)).toThrow(/unsafe/);
  });

  it("rejects hidden paid software under a no-cost declaration", async () => {
    const draft = await new FakePracticalTaskProvider().generate(context);
    const parsed = practicalTaskDraftSchema.parse({
      ...draft,
      freeAlternative: {
        ...draft.freeAlternative!,
        instructions: ["Use a paid software subscription."],
        cost: { kind: "none" },
      },
    });
    expect(() => assertSafePracticalTask(parsed)).toThrow(/paid/);
  });
});
