import { describe, expect, it } from "vitest";
import {
  gradeNumericAnswer,
  parseNumericAnswer,
} from "../packages/domain/numeric-grading";

const key = {
  unitPolicy: "required" as const,
  expectedValue: 12,
  expectedUnit: "m/s" as const,
  allowedUnits: ["m/s" as const, "km/h" as const],
  absoluteTolerance: 0.01,
  relativeTolerance: 0.001,
};

describe("numeric grading", () => {
  it("uses inclusive maximum absolute or relative tolerance", () => {
    expect(gradeNumericAnswer("12.012 m/s", key).outcome).toBe("correct");
    expect(gradeNumericAnswer("12.0121 m/s", key).outcome).toBe("incorrect");
  });

  it("converts only allow-listed compatible units", () => {
    expect(gradeNumericAnswer("43.2 km/h", key).outcome).toBe("correct");
    expect(gradeNumericAnswer("12 km", key).outcome).toBe("invalid");
    expect(gradeNumericAnswer("12", key).outcome).toBe("invalid");
  });

  it("implements optional and forbidden unit policies", () => {
    expect(
      gradeNumericAnswer("12", { ...key, unitPolicy: "optional" }).outcome,
    ).toBe("correct");
    expect(
      gradeNumericAnswer("43.2 km/h", { ...key, unitPolicy: "optional" })
        .outcome,
    ).toBe("correct");
    const unitless = {
      unitPolicy: "forbidden" as const,
      expectedValue: 12,
      expectedUnit: null,
      allowedUnits: [] as [],
      absoluteTolerance: 0,
      relativeTolerance: 0,
    };
    expect(gradeNumericAnswer("12", unitless).outcome).toBe("correct");
    expect(gradeNumericAnswer("12 m", unitless).outcome).toBe("invalid");
  });

  it("accepts one finite number and rejects ambiguous or malformed input", () => {
    expect(parseNumericAnswer("1e1 m/s")).toMatchObject({
      ok: true,
      value: 10,
    });
    for (const value of [
      "NaN m/s",
      "Infinity m/s",
      "12 + 1 m/s",
      "1,000 m/s",
      "",
    ])
      expect(parseNumericAnswer(value).ok).toBe(false);
  });
});
