import type { PracticalTaskDraft } from "../../../packages/contracts/practical-tasks";

const url =
  /(?:https?:\/\/|www\.|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:\/[^\s]*)?\b)/i;
const hazards =
  /\b(?:acid|biological|bleach|blood|blowtorch|boil(?:ing)?|chainsaw|chemical|climb(?:ing)?|combustible|cut(?:ting)?|drill|electric(?:al|ity)?|explosive|fire|firearm|flame|gas|height|high[- ]voltage|hot water|ingest(?:ion)?|knife|lab(?:oratory)?|ladder|laser|machine(?:ry)?|medical|medication|motorcycle|needle|oven|poison|power tool|radiation|roof|saw|stove|supervision|syringe|timber|vehicle|weapon)\b/i;
const paid =
  /(?:\$\s*\d)|\b(?:buy|charge|deposit|dollars?|fee|licen[cs]e|paid|pay|payment|price|purchase|rent|subscription)\b/i;
const executable =
  /\b(?:build|compile|create|debug|draft|enter|execute|implement|paste|run|write)\b.{0,40}\b(?:code|command|function|program|query|script|shell|stylesheet|terminal)\b|\b(?:bash|c\+\+|css|curl|html|java(?:script)?|powershell|python|sql(?:\s+query)?|wget)\b/i;
const softwareChange = /\b(?:download|install|uninstall)\b/i;
const credentials =
  /\b(?:account|credential|password|passcode|username|user[ -]?name|email address|api[ -]?key|access[ -]?token|secret[ -]?key|register|sign[ -]?up|sign[ -]?in|log[ -]?in)\b/i;
const fileOperation =
  /\b(?:open|read|write|edit|create|save|delete|rename|move|copy|upload)\b.{0,40}\b(?:file|folder|directory)\b|\b(?:file|folder|directory)\b.{0,40}\b(?:open|read|write|edit|create|save|delete|rename|move|copy|upload)\b/i;
const networkInstruction =
  /\b(?:browse|connect|find|look up|open|post|request|search|send|upload|visit)\b.{0,40}\b(?:network|internet|online|server|web|website|api|url)\b/i;
const dataTransfer =
  /\b(?:export|import)\b.{0,40}\b(?:csv|data|document|file|json|pdf|result|spreadsheet)\b/i;
const physicalProcedure =
  /\b(?:climb|cross|cut|drill|drive|enter|handle|heat|ignite|light|mix|operate|ride|travel|use|walk)\b.{0,40}\b(?:blade|blowtorch|chainsaw|chemical|device|equipment|firearm|flame|ladder|lathe|location|machine|match|motor|power tool|road|roof|saw|site|street|tool|traffic|vehicle|wire)\b/i;

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
    values.some((value) =>
      [
        executable,
        softwareChange,
        credentials,
        fileOperation,
        networkInstruction,
        dataTransfer,
        physicalProcedure,
      ].some((pattern) => pattern.test(value)),
    )
  )
    throw new Error(
      "Practical task contains executable or external instructions",
    );
  for (const variant of [task.task, task.simpler, task.freeAlternative]) {
    if (!variant) continue;
    if (
      variant.modality !== "written_analysis" ||
      variant.connectivity.requirement !== "none" ||
      variant.cost.kind !== "none" ||
      variant.requiredTools.some(
        (tool) => !["paper", "pen", "notes_app", "calculator"].includes(tool),
      )
    )
      throw new Error("Practical task is outside the safe desk-work boundary");
    if (variantValues(variant).some((value) => paid.test(value)))
      throw new Error("Practical task contains a paid requirement");
  }
}
