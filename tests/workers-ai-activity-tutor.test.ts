import { describe, expect, it } from "vitest";
import { activityTutorProviderForEnv } from "../apps/worker/src/activity-tutor-provider";
import type { Env } from "../apps/worker/src/env";
import { WorkersAiActivityTutorProvider } from "../packages/adapters/workers-ai-activity-tutor";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import type { TutorContext } from "../packages/contracts/activity-tutor";

const context: TutorContext = {
  requestId: "10000000-0000-4000-8000-000000000001",
  packId: "10000000-0000-4000-8000-000000000002",
  questionId: "10000000-0000-4000-8000-000000000003",
  kind: "hint",
  question: {
    type: "recall",
    prompt: "Explain the process.",
    conceptIds: ["hidden-concept-id"],
    sources: [
      { id: "source-1", location: 1, start: 0, end: 10, text: "First fact" },
      {
        id: "source-2",
        location: 1,
        start: 11,
        end: 22,
        text: "Second fact",
      },
    ],
  },
};

class RecordingAi implements WorkersAiRunner {
  response: unknown = {
    response: JSON.stringify({
      schemaVersion: 1,
      text: "Look for the relationship described by the first fact.",
      sourceIds: ["source-1"],
    }),
  };
  call?: {
    model: string;
    input: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  async run(
    model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.call = { model, input, options };
    return this.response;
  }
}

const provider = (ai: RecordingAi) =>
  new WorkersAiActivityTutorProvider(ai, {
    gatewayId: "tai",
    model: "@cf/example/model",
  });

describe("Workers AI activity tutor provider", () => {
  it("generates a bounded hint and reconstructs immutable fields", async () => {
    const ai = new RecordingAi();
    const result = await provider(ai).generate(context);
    expect(result).toMatchObject({
      requestId: context.requestId,
      packId: context.packId,
      questionId: context.questionId,
      kind: "hint",
      sources: [context.question.sources[0]],
      supportedByMaterial: true,
    });
    expect(ai.call).toMatchObject({
      model: "@cf/example/model",
      input: {
        max_tokens: 1_800,
        temperature: 0.2,
        response_format: { type: "json_schema" },
      },
      options: {
        gateway: { id: "tai", skipCache: true, collectLog: false },
      },
    });
    const messages = JSON.stringify(ai.call?.input.messages);
    expect(messages).not.toContain(context.requestId);
    expect(messages).not.toContain(context.packId);
    expect(messages).not.toContain(context.questionId);
    expect(messages).not.toContain("hidden-concept-id");
    expect(messages).not.toMatch(/correctOptionId|supportedAnswer|rubric/);
  });

  it("uses the requested explanation instruction without hidden keys", async () => {
    const ai = new RecordingAi();
    const scoped = { ...context, kind: "explain_again" as const };
    const result = await provider(ai).generate(scoped);
    expect(result.kind).toBe("explain_again");
    expect(JSON.stringify(ai.call?.input.messages)).toContain("another way");
  });

  it("rejects invalid citations, duplicates, oversized hints and malformed JSON", async () => {
    const ai = new RecordingAi();
    ai.response = {
      response: JSON.stringify({
        schemaVersion: 1,
        text: "Unsupported",
        sourceIds: ["invented"],
      }),
    };
    await expect(provider(ai).generate(context)).rejects.toThrow(
      "cited an invalid source",
    );
    ai.response = {
      response: JSON.stringify({
        schemaVersion: 1,
        text: "Repeated",
        sourceIds: ["source-1", "source-1"],
      }),
    };
    await expect(provider(ai).generate(context)).rejects.toThrow(
      "repeated a source",
    );
    ai.response = {
      response: JSON.stringify({
        schemaVersion: 1,
        text: "x".repeat(601),
        sourceIds: ["source-1"],
      }),
    };
    await expect(provider(ai).generate(context)).rejects.toThrow(
      "Hint is too long",
    );
    ai.response = { response: "not JSON" };
    await expect(provider(ai).generate(context)).rejects.toBeInstanceOf(
      SyntaxError,
    );
  });

  it("exposes provenance and fails closed for live configuration", () => {
    expect(provider(new RecordingAi()).metadata).toEqual({
      provider: "workers_ai",
      model: "@cf/example/model",
      promptVersion: "activity-tutor-v1",
      schemaVersion: 1,
    });
    expect(
      activityTutorProviderForEnv({ AI_PROVIDER: "fake" } as Env),
    ).toBeDefined();
    expect(() =>
      activityTutorProviderForEnv({ AI_PROVIDER: "workers_ai" } as Env),
    ).toThrow("Workers AI is not configured");
    expect(() =>
      activityTutorProviderForEnv({ AI_PROVIDER: "invalid" } as Env),
    ).toThrow("Invalid AI provider configuration");
  });
});
