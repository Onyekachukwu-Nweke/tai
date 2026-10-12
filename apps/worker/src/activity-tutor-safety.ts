import type { ActivityQuestion } from "../../../packages/contracts/activity-packs";

const compact = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

function containsProtectedPhrase(output: string, protectedText: string) {
  const candidate = compact(output);
  const answer = compact(protectedText);
  if (!answer) return false;
  return answer.length >= 3 ? candidate.includes(answer) : candidate === answer;
}

function containsExpectedNumber(output: string, expected: number) {
  const numbers = output.match(/[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?/gi);
  return numbers?.some((value) => Number(value) === expected) ?? false;
}

export function assertTutorAnswerConcealed(
  output: string,
  question: ActivityQuestion,
) {
  let leaked = false;
  if (question.type === "recall")
    leaked = containsProtectedPhrase(output, question.supportedAnswer);
  if (question.type === "mcq") {
    const correct = question.options.find(
      (option) => option.id === question.correctOptionId,
    );
    leaked = Boolean(
      (correct && containsProtectedPhrase(output, correct.text)) ||
      containsProtectedPhrase(output, question.answerExplanation),
    );
  }
  if (question.type === "calculation")
    leaked =
      containsExpectedNumber(output, question.numericKey.expectedValue) ||
      containsProtectedPhrase(output, question.workedExplanation);
  if (leaked)
    throw new Error("Tutor response revealed protected answer material");
}
