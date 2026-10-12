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

  it("rejects executable, credential, file, and network instructions", async () => {
    const blocked = [
      "Run a shell command to inspect the claim.",
      "Download and install the analysis tool.",
      "Enter your API key and password.",
      "Open a file and edit the folder contents.",
      "Connect to the internet and visit a website.",
      "Read example.edu and summarize it.",
      "Create an account on the learning platform.",
      "Write a SQL query that groups the examples.",
      "Draft a CSS stylesheet.",
      "Implement a C++ function.",
      "Export the result as CSV.",
      "Search online for three examples.",
      "Provide your username.",
      "Light a match and record what happens.",
      "Operate a lathe to make a model.",
      "Cross a busy road and record traffic.",
    ];
    for (const instruction of blocked) {
      const draft = await new FakePracticalTaskProvider().generate(context);
      draft.task!.instructions = [instruction];
      expect(() => assertSafePracticalTask(draft)).toThrow(
        /external|executable/,
      );
    }
  });

  it("rejects paid requirements in every variant", async () => {
    for (const key of ["task", "simpler", "freeAlternative"] as const) {
      const draft = await new FakePracticalTaskProvider().generate(context);
      draft[key]!.instructions = ["Purchase a subscription before writing."];
      expect(() => assertSafePracticalTask(draft)).toThrow(/paid/);
    }
  });

  it("rejects dangerous tools in every variant", async () => {
    for (const key of ["task", "simpler", "freeAlternative"] as const) {
      const draft = await new FakePracticalTaskProvider().generate(context);
      draft[key]!.instructions = ["Use a chainsaw to shape wood."];
      expect(() => assertSafePracticalTask(draft)).toThrow(/unsafe/);
    }
  });

  it.each(["Pay $10 before starting.", "A $10 charge is required."])(
    "rejects numeric payment wording: %s",
    async (instruction) => {
      const draft = await new FakePracticalTaskProvider().generate(context);
      draft.task!.instructions = [instruction];
      expect(() => assertSafePracticalTask(draft)).toThrow(/paid/);
    },
  );

  it("allows ordinary source-grounded writing without connectivity", async () => {
    const draft = await new FakePracticalTaskProvider().generate(context);
    expect(() => assertSafePracticalTask(draft)).not.toThrow();
  });
});
