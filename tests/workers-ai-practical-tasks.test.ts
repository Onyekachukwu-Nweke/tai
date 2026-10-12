import { describe, expect, it } from "vitest";
import type { Env } from "../apps/worker/src/env";
import { practicalTaskProviderForEnv } from "../apps/worker/src/practical-task-provider";
import { WorkersAiPracticalTaskProvider } from "../packages/adapters/workers-ai-practical-tasks";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import type { PracticalContext } from "../packages/contracts/practical-tasks";

const context: PracticalContext = {
  studySpaceId: "10000000-0000-4000-8000-000000000001",
  materialId: "10000000-0000-4000-8000-000000000002",
  conceptRequestId: "10000000-0000-4000-8000-000000000003",
  concepts: [
    {
      id: "10000000-0000-4000-8000-000000000004",
      label: "Evidence comparison",
      sources: [
        {
          id: "source-1",
          location: 2,
          start: 20,
          end: 36,
          text: "Synthetic source",
        },
      ],
    },
  ],
};
const variant = {
  modality: "written_analysis",
  objective: "Compare two claims in writing.",
  instructions: ["Write one comparison grounded in the source."],
  expectedOutput: "A short written comparison.",
  requiredTools: ["paper", "pen"],
  estimatedMinutes: 10,
  selfCheck: ["Both claims are supported by the source."],
  connectivity: { requirement: "none", disclosure: "No connection needed." },
  cost: { kind: "none" },
};
class RecordingAi implements WorkersAiRunner {
  response: unknown = {
    response: JSON.stringify({
      schemaVersion: 1,
      suitable: true,
      sourceIds: ["source-1"],
      task: variant,
      simpler: { ...variant, estimatedMinutes: 5 },
      freeAlternative: variant,
    }),
  };
  call?: { input: Record<string, unknown>; options: Record<string, unknown> };
  async run(
    _model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.call = { input, options };
    return this.response;
  }
}
const provider = (ai: RecordingAi) =>
  new WorkersAiPracticalTaskProvider(ai, {
    gatewayId: "tai",
    model: "@cf/example/model",
  });

describe("Workers AI practical task provider", () => {
  it("sends reduced source data and rebuilds trusted fields", async () => {
    const ai = new RecordingAi();
    const result = await provider(ai).generate(context);
    expect(result).toMatchObject({
      suitable: true,
      conceptIds: [context.concepts[0]!.id],
      sourceIds: ["source-1"],
      reason: "The selected source supports a safe written application.",
    });
    const messages = JSON.stringify(ai.call?.input.messages);
    expect(messages).toContain("Evidence comparison");
    expect(messages).toContain("Synthetic source");
    expect(messages).not.toContain(context.studySpaceId);
    expect(messages).not.toContain(context.materialId);
    expect(messages).not.toContain(context.conceptRequestId);
    expect(messages).not.toContain(context.concepts[0]!.id);
    expect(messages).not.toMatch(/location|start|end|completion/i);
    expect(ai.call?.options).toMatchObject({
      gateway: { id: "tai", skipCache: true, collectLog: false },
    });
  });

  it("rejects invented and repeated citations", async () => {
    const ai = new RecordingAi();
    for (const sourceIds of [["invented"], ["source-1", "source-1"]]) {
      ai.response = {
        response: JSON.stringify({
          schemaVersion: 1,
          suitable: true,
          sourceIds,
          task: variant,
          simpler: variant,
          freeAlternative: variant,
        }),
      };
      await expect(provider(ai).generate(context)).rejects.toThrow(/source/);
    }
  });

  it("rejects output outside the reduced live variant contract", async () => {
    const invalidVariants = [
      { ...variant, estimatedMinutes: 120 },
      {
        ...variant,
        requiredTools: ["paper", "pen", "notes_app", "calculator", "paper"],
      },
      { ...variant, modality: "code_exercise" },
      {
        ...variant,
        connectivity: { requirement: "required", disclosure: "Go online." },
      },
    ];
    for (const task of invalidVariants) {
      const ai = new RecordingAi();
      ai.response = {
        response: JSON.stringify({
          schemaVersion: 1,
          suitable: true,
          sourceIds: ["source-1"],
          task,
          simpler: variant,
          freeAlternative: variant,
        }),
      };
      await expect(provider(ai).generate(context)).rejects.toThrow();
    }
  });

  it("uses fixed unsuitable copy and exposes fail-closed provenance", async () => {
    const ai = new RecordingAi();
    ai.response = {
      response: JSON.stringify({
        schemaVersion: 1,
        suitable: false,
        sourceIds: ["source-1"],
        task: null,
        simpler: null,
        freeAlternative: null,
      }),
    };
    expect((await provider(ai).generate(context)).reason).toMatch(
      /No safe desk-based written task/,
    );
    expect(provider(ai).metadata).toEqual({
      provider: "workers_ai",
      model: "@cf/example/model",
      promptVersion: "practical-task-v1",
      schemaVersion: 1,
    });
    expect(
      practicalTaskProviderForEnv({ AI_PROVIDER: "fake" } as Env),
    ).toBeDefined();
    expect(() =>
      practicalTaskProviderForEnv({ AI_PROVIDER: "workers_ai" } as Env),
    ).toThrow("Workers AI is not configured");
    expect(() =>
      practicalTaskProviderForEnv({ AI_PROVIDER: "invalid" } as Env),
    ).toThrow("Invalid AI provider configuration");
  });
});
