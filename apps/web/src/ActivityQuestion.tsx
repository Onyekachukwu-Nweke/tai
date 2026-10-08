import { useEffect, useState } from "react";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import type {
  ActivityAttemptRequest,
  ActivityAttemptResponse,
} from "../../../packages/contracts/activity-attempts";
import { gradeMcq } from "../../../packages/contracts/activity-attempts";
import { saveActivityAttempt, saveActivityFlag } from "./activity-attempt-api";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type ActivityDraft,
} from "./activity-drafts";

type Question = LearnerActivityPack["questions"][number];
export function ActivityQuestion({
  userId,
  spaceId,
  packId,
  question,
  onSource,
  initialResult,
  initialFlag,
}: {
  userId: string;
  spaceId: string;
  packId: string;
  question: Question;
  onSource: (source: Question["sources"][number]) => void;
  initialResult: ActivityAttemptResponse | null;
  initialFlag: "incorrect" | "ambiguous" | null;
}) {
  const loaded = loadDraft(userId, spaceId, packId, question.id);
  const [draft, setDraft] = useState<ActivityDraft>(loaded.draft);
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const [result, setResult] = useState<ActivityAttemptResponse | null>(
    initialResult,
  );
  const [flag, setFlag] = useState(initialFlag);
  const [localCorrectness, setLocalCorrectness] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [checkingRecall, setCheckingRecall] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (initialResult) setResult(initialResult);
  }, [initialResult]);
  useEffect(() => {
    if (initialFlag) setFlag(initialFlag);
  }, [initialFlag]);
  useEffect(() => {
    if (!result)
      setStorageWarning(saveDraft(userId, spaceId, packId, question.id, draft));
  }, [draft, packId, question.id, result, spaceId, userId]);
  const base = () => ({
    schemaVersion: 1 as const,
    attemptId: draft.attemptId,
    packId,
    questionId: question.id,
    confidence: draft.confidence || null,
  });
  async function submit(input: ActivityAttemptRequest) {
    setBusy(true);
    setError("");
    try {
      const saved = await saveActivityAttempt(spaceId, input);
      setResult(saved);
      setStorageWarning(clearDraft(userId, spaceId, packId, question.id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Your response could not be saved. Retry explicitly.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveFlag(reason: "incorrect" | "ambiguous") {
    setBusy(true);
    setError("");
    try {
      const saved = await saveActivityFlag(spaceId, {
        schemaVersion: 1,
        packId,
        questionId: question.id,
        reason,
      });
      setFlag(saved.reason);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The flag could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  function update(update: Partial<ActivityDraft>) {
    setDraft((value) => ({ ...value, ...update }));
  }
  const confidence = (
    <label>
      Confidence (optional)
      <select
        value={draft.confidence}
        disabled={busy || Boolean(result)}
        onChange={(e) =>
          update({ confidence: e.target.value as ActivityDraft["confidence"] })
        }
      >
        <option value="">Not set</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </label>
  );
  return (
    <li className="activity-card">
      <p>
        <strong>
          {question.type === "mcq"
            ? "Multiple choice"
            : question.type === "recall"
              ? "Recall"
              : "Explain"}
        </strong>{" "}
        · about {question.estimatedMinutes} min
      </p>
      <p>{question.prompt}</p>
      {!result && question.type === "mcq" && (
        <fieldset disabled={busy}>
          <legend>Choose one answer</legend>
          {question.options.map((option) => (
            <label key={option.id}>
              <input
                type="radio"
                name={`option-${question.id}`}
                checked={draft.selectedOptionId === option.id}
                onChange={() => update({ selectedOptionId: option.id })}
              />
              {option.text}
            </label>
          ))}
        </fieldset>
      )}
      {!result && question.type !== "mcq" && (
        <label>
          Your response
          <textarea
            value={draft.answer}
            disabled={busy}
            maxLength={8000}
            onChange={(e) => update({ answer: e.target.value })}
          />
        </label>
      )}
      {!result && confidence}
      {!result && question.type === "mcq" && (
        <button
          disabled={busy || Boolean(flag) || !draft.selectedOptionId}
          onClick={() => (
            setLocalCorrectness(
              gradeMcq(draft.selectedOptionId, question.review.correctOptionId),
            ),
            void submit({
              ...base(),
              interaction: "mcq_submit",
              selectedOptionId: draft.selectedOptionId,
            })
          )}
        >
          Submit answer
        </button>
      )}
      {!result && question.type === "mcq" && flag && (
        <p>
          This flagged question cannot be submitted for a scored result because
          it is excluded from future scoring.
        </p>
      )}
      {!result && question.type === "explain" && (
        <button
          disabled={busy || !draft.answer.trim()}
          onClick={() =>
            void submit({
              ...base(),
              interaction: "explain_submit",
              answer: draft.answer,
            })
          }
        >
          Save explanation
        </button>
      )}
      {!result && question.type === "recall" && !checkingRecall && (
        <button
          disabled={busy || !draft.answer.trim()}
          onClick={() => setCheckingRecall(true)}
        >
          Check against supported answer
        </button>
      )}
      {!result && question.type === "recall" && checkingRecall && (
        <div className="notice">
          <p>
            <strong>Supported by your material:</strong>{" "}
            {question.review.supportedAnswer}
          </p>
          <p>How did your answer compare?</p>
          {(["remembered", "partial", "not_yet"] as const).map((value) => (
            <button
              key={value}
              disabled={busy}
              className="secondary"
              onClick={() =>
                void submit({
                  ...base(),
                  interaction: "recall_self_check",
                  answer: draft.answer,
                  selfAssessment: value,
                })
              }
            >
              {value === "not_yet"
                ? "Not yet"
                : value[0]!.toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      )}
      {!result && (
        <div className="preview-actions">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void submit({ ...base(), interaction: "reveal" })}
          >
            Reveal answer
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void submit({ ...base(), interaction: "skip" })}
          >
            Skip
          </button>
        </div>
      )}
      {busy && <p role="status">Saving before completion…</p>}
      {error && (
        <p role="alert" className="error">
          {error} Your draft remains in this browser. Retry explicitly.
        </p>
      )}
      {storageWarning && (
        <p role="status" className="error">
          {storageWarning}
        </p>
      )}
      {result && (
        <div className="notice">
          <p>
            <strong>
              {result.supportedByMaterial
                ? "Supported by your material"
                : "Saved without grading"}
              :
            </strong>{" "}
            {result.feedback}
          </p>
          {result.answer && <p>{result.answer}</p>}
          {question.type === "mcq" && result.correctOptionId && (
            <p>{question.review.answerExplanation}</p>
          )}
          <p>
            {result.correctness
              ? `Result: ${result.correctness}.`
              : "No scored correctness result."}{" "}
            Hint used: no. Confidence: {result.confidence ?? "not set"}.
          </p>
          {result.correctness && localCorrectness === result.correctness && (
            <p>The instant browser check was confirmed by the server.</p>
          )}
        </div>
      )}
      <div className="preview-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void saveFlag("incorrect")}
        >
          Flag incorrect
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void saveFlag("ambiguous")}
        >
          Flag ambiguous
        </button>
      </div>
      {flag && (
        <p role="status">
          Flagged as {flag}. This question is excluded from future scoring.
        </p>
      )}
      <ul aria-label={`Sources for ${question.prompt}`}>
        {question.sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              className="source-link"
              onClick={() => onSource(source)}
            >
              Open source section {source.location}: {source.text.slice(0, 80)}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
