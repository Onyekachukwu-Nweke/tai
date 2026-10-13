import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { LiveEvaluationConfig } from "../scripts/live-evaluation-config";
import { runLiveEvaluation } from "../scripts/live-evaluation";
import { writeLiveEvaluationReport } from "../scripts/live-evaluation-report";
import type { CallObservation } from "../scripts/live-evaluation-transport";

const config: LiveEvaluationConfig = {
  accountId: "account-secret",
  apiToken: "token-secret",
  gatewayId: "gateway-secret",
  models: ["@cf/first", "@cf/second"],
};

describe("live evaluation failure boundaries", () => {
  it("runs four calls sequentially without retrying failures or leaking details", async () => {
    const calls: string[] = [];
    let active = 0;
    let maximumActive = 0;
    const observations: CallObservation[] = [];
    const runner = {
      observations,
      async run(model: string) {
        calls.push(model);
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        observations.push({
          httpStatus: 503,
          latencyMs: 2,
          usage: null,
          reportedCostUsd: null,
        });
        active -= 1;
        throw new Error(
          "provider output with token-secret and private source sentence",
        );
      },
    };

    const { report } = await runLiveEvaluation(
      config,
      runner,
      new Date("2026-10-13T00:00:00.000Z"),
    );

    expect(calls).toEqual([
      "@cf/first",
      "@cf/first",
      "@cf/second",
      "@cf/second",
    ]);
    expect(maximumActive).toBe(1);
    expect(report.records).toHaveLength(4);
    expect(report.records.every(({ outcome }) => outcome === "rejected")).toBe(
      true,
    );
    expect(JSON.stringify(report)).not.toMatch(
      /token-secret|private source sentence|account-secret/,
    );
  });

  it("writes a sanitized report with owner-only permissions", async () => {
    const root = await mkdtemp(join(tmpdir(), "tai-live-eval-"));
    const observations: CallObservation[] = [];
    const runner = {
      observations,
      async run() {
        observations.push({
          httpStatus: null,
          latencyMs: 1,
          usage: null,
          reportedCostUsd: null,
        });
        throw new Error(
          "token-secret private source sentence full model output",
        );
      },
    };
    const { report } = await runLiveEvaluation(config, runner);
    const path = await writeLiveEvaluationReport(report, root);
    const contents = await readFile(path, "utf8");

    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(contents).not.toMatch(
      /token-secret|private source sentence|full model output|account-secret/,
    );
    expect(report.records[0]).toMatchObject({
      reportedUsage: null,
      reportedCostUsd: null,
      usageUnavailableReason: expect.any(String),
      costUnavailableReason: expect.any(String),
    });
  });
});
