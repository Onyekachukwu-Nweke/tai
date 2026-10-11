import type { PracticalTaskDraft } from "../../../packages/contracts/practical-tasks";

const url = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|io)\b)/i;
const hazards =
  /\b(?:acid|biological|bleach|blood|boil(?:ing)?|chemical|climb(?:ing)?|combustible|cut(?:ting)?|drill|electric(?:al|ity)?|explosive|fire|flame|gas|height|high[- ]voltage|hot water|ingest(?:ion)?|knife|lab(?:oratory)?|ladder|laser|machine(?:ry)?|medical|medication|motorcycle|needle|oven|poison|power tool|radiation|roof|saw|stove|supervision|syringe|timber|vehicle|weapon)\b/i;
const paid = /\b(?:cost|fee|licen[cs]e|paid|purchase|rent|subscription)\b/i;

function variantValues(variant: NonNullable<PracticalTaskDraft["task"]>) {
  return [
    variant.objective,
    ...variant.instructions,
    variant.expectedOutput,
    ...variant.requiredTools,
    ...variant.selfCheck,
    variant.connectivity.disclosure,
    ...(variant.cost.kind === "disclosed" ? [variant.cost.disclosure] : []),
  ];
}

export function assertSafePracticalTask(task: PracticalTaskDraft) {
  if (!task.suitable) return;
  const values: string[] = [];
  for (const variant of [task.task, task.simpler, task.freeAlternative]) {
    if (!variant) continue;
    values.push(...variantValues(variant));
  }
  if (values.some((value) => url.test(value)))
    throw new Error("Practical tasks cannot contain external URLs");
  if (values.some((value) => hazards.test(value)))
    throw new Error("Practical task requires unsafe or supervised activity");
  if (
    task.freeAlternative &&
    variantValues(task.freeAlternative).some((value) => paid.test(value))
  )
    throw new Error("The free alternative contains a paid requirement");
}
