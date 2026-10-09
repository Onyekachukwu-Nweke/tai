export const unitRegistry = {
  m: { dimension: "length", scale: 1 },
  cm: { dimension: "length", scale: 0.01 },
  km: { dimension: "length", scale: 1000 },
  s: { dimension: "time", scale: 1 },
  min: { dimension: "time", scale: 60 },
  h: { dimension: "time", scale: 3600 },
  "m/s": { dimension: "speed", scale: 1 },
  "km/h": { dimension: "speed", scale: 1 / 3.6 },
  g: { dimension: "mass", scale: 0.001 },
  kg: { dimension: "mass", scale: 1 },
} as const;

export type SupportedUnit = keyof typeof unitRegistry;
type NumericTolerance = {
  expectedValue: number;
  absoluteTolerance: number;
  relativeTolerance: number;
};
export type NumericKey = NumericTolerance &
  (
    | {
        unitPolicy: "required" | "optional";
        expectedUnit: SupportedUnit;
        allowedUnits: SupportedUnit[];
      }
    | {
        unitPolicy: "forbidden";
        expectedUnit: null;
        allowedUnits: [];
      }
  );

const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseNumericAnswer(value: string) {
  const match = value.trim().match(/^([^\s]+)(?:\s+([^\s]+))?$/);
  if (!match || !numberPattern.test(match[1]!))
    return {
      ok: false as const,
      error: "Enter one finite number and a supported unit.",
    };
  const numericValue = Number(match[1]);
  if (!Number.isFinite(numericValue))
    return {
      ok: false as const,
      error: "Enter one finite number and a supported unit.",
    };
  return { ok: true as const, value: numericValue, unit: match[2] ?? null };
}

export function gradeNumericAnswer(answer: string, key: NumericKey) {
  const parsed = parseNumericAnswer(answer);
  if (!parsed.ok) return { outcome: "invalid" as const, message: parsed.error };
  if (key.unitPolicy === "required" && !parsed.unit)
    return {
      outcome: "invalid" as const,
      message: `Include a unit (${key.allowedUnits.join(" or ")}).`,
    };
  if (key.unitPolicy === "forbidden") {
    if (parsed.unit)
      return {
        outcome: "invalid" as const,
        message: "Enter only the number; this question does not use a unit.",
      };
  } else if (
    parsed.unit &&
    (!(parsed.unit in unitRegistry) ||
      !key.allowedUnits.includes(parsed.unit as SupportedUnit))
  ) {
    return {
      outcome: "invalid" as const,
      message: "That unit is not supported for this question.",
    };
  }
  const submitted = parsed.unit
    ? unitRegistry[parsed.unit as SupportedUnit]
    : null;
  const expected = key.expectedUnit ? unitRegistry[key.expectedUnit] : null;
  if (submitted && expected && submitted.dimension !== expected.dimension)
    return {
      outcome: "invalid" as const,
      message: "That unit is incompatible with the expected quantity.",
    };
  const converted =
    submitted && expected
      ? (parsed.value * submitted.scale) / expected.scale
      : parsed.value;
  const tolerance = Math.max(
    key.absoluteTolerance,
    key.relativeTolerance * Math.abs(key.expectedValue),
  );
  const roundingAllowance =
    Number.EPSILON *
    Math.max(1, Math.abs(converted), Math.abs(key.expectedValue)) *
    4;
  const correct =
    Math.abs(converted - key.expectedValue) <= tolerance + roundingAllowance;
  return {
    outcome: correct ? ("correct" as const) : ("incorrect" as const),
    message: correct
      ? "The final number and unit are within tolerance."
      : "The final number is outside the accepted tolerance.",
    submittedValue: parsed.value,
    submittedUnit: parsed.unit as SupportedUnit | null,
    convertedValue: converted,
    tolerance,
  };
}
