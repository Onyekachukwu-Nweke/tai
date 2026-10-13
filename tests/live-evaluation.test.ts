import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import {
  DEFAULT_LIVE_MODELS,
  readLiveEvaluationConfig,
} from "../scripts/live-evaluation-config";
import { runLiveEvaluation } from "../scripts/live-evaluation";
import {
  classifyLiveError,
  writeLiveEvaluationReport,
} from "../scripts/live-evaluation-report";
import { writeLiveEvaluationReview } from "../scripts/live-evaluation-review";
import {
  CloudflareRestAiRunner,
  type CallObservation,
} from "../scripts/live-evaluation-transport";

const validEnv = {
  TAI_LIVE_EVAL_ENABLED: "I_ACCEPT_LIVE_AI_COST",
  AI_CALLS_ENABLED: "true",
  CLOUDFLARE_ACCOUNT_ID: "account",
  CLOUDFLARE_API_TOKEN: "secret-token",
  AI_GATEWAY_ID: "tai",
};

function response(result: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status === 200, result }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function concepts(sourceId = "synthetic-speed-source") {
  return {
    response: JSON.stringify({
      schemaVersion: 1,
      concepts: [
        {
          title: "Average speed",
          description: "Distance divided by time.",
          sourceIds: [sourceId],
        },
      ],
      relations: [],
    }),
  };
}

function pack() {
  const conceptIds = [
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
  ];
  return {
    response: JSON.stringify({
      schemaVersion: 1,
      questions: [
        {
          draftId: "q1",
          type: "recall",
          conceptIds: [conceptIds[0]],
          sourceIds: ["synthetic-speed-source"],
          prompt: "What is average speed?",
          estimatedMinutes: 2,
          supportedAnswer: "Distance divided by time.",
        },
        {
          draftId: "q2",
          type: "explain",
          conceptIds: [conceptIds[1]],
          sourceIds: ["synthetic-risk-source"],
          prompt: "Explain a useful risk response.",
          estimatedMinutes: 3,
          rubric: ["Names likelihood, impact, owner, and mitigation"],
        },
        {
          draftId: "q3",
          type: "mcq",
          conceptIds,
          sourceIds: ["synthetic-speed-source", "synthetic-risk-source"],
          prompt: "Which response uses both supplied ideas?",
          estimatedMinutes: 4,
          options: [
            { draftId: "a", text: "Calculate speed and document the risk" },
            { draftId: "b", text: "Ignore the measurements" },
            { draftId: "c", text: "Remove the risk owner" },
          ],
          correctOptionDraftId: "a",
          answerExplanation: "The first option applies both excerpts.",
        },
      ],
    }),
  };
}

class FixtureRunner implements WorkersAiRunner {
  observations: CallObservation[] = [];
  calls = 0;
  constructor(private readonly mode: "valid" | "malformed" | "invented") {}
  async run(_model: string, input: Record<string, unknown>) {
    this.calls += 1;
    this.observations.push({
      httpStatus: 200,
      latencyMs: 7,
      usage: null,
      reportedCostUsd: null,
    });
    if (this.mode === "malformed") return { response: "not json" };
    const messages = input.messages as Array<{ content: string }>;
    const isConcept = messages[0]?.content.includes("Organize only");
    if (isConcept)
      return concepts(this.mode === "invented" ? "invented-source" : undefined);
    return pack();
  }
}

describe("live evaluation safety", () => {
  it("refuses before any fetch without exact opt-in and call switch", () => {
    const fetcher = vi.fn();
    expect(() =>
      readLiveEvaluationConfig({ ...validEnv, TAI_LIVE_EVAL_ENABLED: "yes" }),
    ).toThrow("explicit cost consent");
    expect(() =>
      readLiveEvaluationConfig({ ...validEnv, AI_CALLS_ENABLED: "false" }),
    ).toThrow("AI_CALLS_ENABLED");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires exactly two distinct Cloudflare models", () => {
    expect(readLiveEvaluationConfig(validEnv).models).toEqual(
      DEFAULT_LIVE_MODELS,
    );
    expect(() =>
      readLiveEvaluationConfig({
        ...validEnv,
        TAI_LIVE_EVAL_MODELS: "@cf/one",
      }),
    ).toThrow("exactly two");
  });

  it("sends bounded privacy headers and never exposes credentials in observations", async () => {
    let captured: RequestInit | undefined;
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      captured = init;
      return response({
        ...concepts(),
        usage: { input_tokens: 12, cost_usd: 0.00001 },
      });
    });
    const runner = new CloudflareRestAiRunner(
      readLiveEvaluationConfig(validEnv),
      fetcher,
    );
    await runner.run("@cf/model", { messages: [] }, {});
    const init = captured!;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "cf-aig-gateway-id": "tai",
      "cf-aig-skip-cache": "true",
      "cf-aig-collect-log": "false",
      "cf-aig-request-timeout": "30000",
      "cf-aig-max-attempts": "1",
    });
    expect(init.body).toBe(
      JSON.stringify({ model: "@cf/model", input: { messages: [] } }),
    );
    expect(JSON.stringify(runner.observations)).not.toContain("secret-token");
    expect(runner.observations[0]?.usage).toEqual({
      input_tokens: 12,
      cost_usd: 0.00001,
    });
    expect(runner.observations[0]?.reportedCostUsd).toBe(0.00001);
  });

  it("enforces the four-call cap without a fifth request", async () => {
    const fetcher: typeof fetch = vi.fn(async () => response(concepts()));
    const runner = new CloudflareRestAiRunner(
      readLiveEvaluationConfig(validEnv),
      fetcher,
    );
    for (let index = 0; index < 4; index += 1)
      await runner.run("@cf/model", {}, {});
    await expect(runner.run("@cf/model", {}, {})).rejects.toThrow("cap");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("categorizes timeout and unavailable-model errors", async () => {
    expect(
      classifyLiveError(new DOMException("timed out", "TimeoutError")),
    ).toBe("timeout");
    expect(
      classifyLiveError(
        new Error("Cloudflare inference failed with status 404"),
      ),
    ).toBe("model_unavailable");
    const timeoutFetch: typeof fetch = vi.fn(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    const timeoutRunner = new CloudflareRestAiRunner(
      readLiveEvaluationConfig(validEnv),
      timeoutFetch,
    );
    await expect(timeoutRunner.run("@cf/model", {}, {})).rejects.toThrow();
    expect(timeoutFetch).toHaveBeenCalledTimes(1);

    const unavailableFetch: typeof fetch = vi.fn(async () => response({}, 404));
    const unavailableRunner = new CloudflareRestAiRunner(
      readLiveEvaluationConfig(validEnv),
      unavailableFetch,
    );
    await expect(unavailableRunner.run("@cf/missing", {}, {})).rejects.toThrow(
      "status 404",
    );
    expect(unavailableFetch).toHaveBeenCalledTimes(1);
  });

  it("records nullable usage and never estimates cost", async () => {
    const runner = new FixtureRunner("valid");
    const { report, review } = await runLiveEvaluation(
      readLiveEvaluationConfig(validEnv),
      runner,
      new Date("2026-10-13T00:00:00.000Z"),
    );
    expect(runner.calls).toBe(4);
    expect(
      report.records.every(
        (record) => record.outcome === "validated_pending_review",
      ),
    ).toBe(true);
    expect(report.records[0]).toMatchObject({
      reportedUsage: null,
      reportedCostUsd: null,
      schemaValid: true,
      sourceIdsValid: true,
    });
    expect(report).toMatchObject({ gatewayId: "tai", manualReview: "pending" });
    expect(JSON.stringify(report)).not.toContain("Distance divided by time");
    expect(JSON.stringify(review)).toContain("Distance divided by time");
    expect(JSON.stringify(review)).not.toContain("150 metres in 30 seconds");
    expect(JSON.stringify(review)).not.toContain("secret-token");
  });

  it.each(["malformed", "invented"] as const)(
    "rejects %s adapter output without recording content",
    async (mode) => {
      const { report } = await runLiveEvaluation(
        readLiveEvaluationConfig(validEnv),
        new FixtureRunner(mode),
      );
      expect(
        report.records.some((record) => record.outcome === "rejected"),
      ).toBe(true);
      expect(
        report.records.every((record) => record.validatedItemCount >= 0),
      ).toBe(true);
      expect(JSON.stringify(report)).not.toContain("invented-source");
    },
  );

  it("classifies non-JSON authentication and model errors by HTTP status", async () => {
    for (const status of [401, 403, 404]) {
      const fetcher: typeof fetch = vi.fn(
        async () => new Response("not json", { status }),
      );
      const runner = new CloudflareRestAiRunner(
        readLiveEvaluationConfig(validEnv),
        fetcher,
      );
      const error = await runner
        .run("@cf/model", {}, {})
        .catch((value) => value);
      expect(classifyLiveError(error)).toBe(
        status === 404 ? "model_unavailable" : "authentication",
      );
    }
  });

  it("creates collision-safe owner-only report and review artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "tai-live-eval-"));
    try {
      const { report, review } = await runLiveEvaluation(
        readLiveEvaluationConfig(validEnv),
        new FixtureRunner("valid"),
        new Date("2026-10-13T00:00:00.000Z"),
      );
      const first = await writeLiveEvaluationReport(report, root);
      const second = await writeLiveEvaluationReport(report, root);
      const reviewPath = await writeLiveEvaluationReview(review, root);
      expect(first).not.toBe(second);
      expect((await stat(first)).mode & 0o777).toBe(0o600);
      expect((await stat(second)).mode & 0o777).toBe(0o600);
      expect((await stat(reviewPath)).mode & 0o777).toBe(0o600);
      expect(await readFile(reviewPath, "utf8")).not.toContain(
        "150 metres in 30 seconds",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
