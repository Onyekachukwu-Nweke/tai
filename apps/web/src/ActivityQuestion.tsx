import { useEffect, useState } from "react";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import {
  gradeMcq,
  type ActivityAttemptResponse,
} from "../../../packages/contracts/activity-attempts";
import { saveActivityAttempt, saveActivityFlag } from "./activity-attempt-api";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type ActivityDraft,
} from "./activity-drafts";
import type { ActivityTutorResponse } from "../../../packages/contracts/activity-tutor";
import { AttemptFeedback } from "./AttemptFeedback";
import { ActivityTutorActions } from "./ActivityTutorActions";
import type { ActivityRubricResponse } from "../../../packages/contracts/activity-rubric";
import { ActivityQuestionFooter } from "./ActivityQuestionFooter";
import { ActivityQuestionPrompt } from "./ActivityQuestionPrompt";
import type { ActivityFollowupResponse } from "../../../packages/contracts/activity-followup";
import { ActivityGradedFeedback } from "./ActivityGradedFeedback";
import { CalculationAnswer } from "./CalculationAnswer";
import { MultipleChoiceAnswer } from "./MultipleChoiceAnswer";
import { ActivityConfidence } from "./ActivityConfidence";
type Question = LearnerActivityPack["questions"][number];
export function ActivityQuestion({
  userId,
  spaceId,
  packId,
  question,
  onSource,
  initialResult,
  initialFlag,
  onProgressChange,
  studySessionId,
  onAttemptSaved,
  sessionReason,
  initialTutor = [],
  onTutorSaved,
  initialRubric,
  onRubricSaved,
  initialFollowup,
  onFollowupSaved,
}: {
  userId: string;
  spaceId: string;
  packId: string;
  question: Question;
  onSource: (source: Question["sources"][number]) => void;
  initialResult: ActivityAttemptResponse | null;
  initialFlag: "incorrect" | "ambiguous" | null;
  onProgressChange: () => void;
  studySessionId?: string;
  onAttemptSaved?: (result: ActivityAttemptResponse) => void;
  sessionReason?: string;
  initialTutor?: ActivityTutorResponse[];
  onTutorSaved: (response: ActivityTutorResponse) => void;
  initialRubric: ActivityRubricResponse | null;
  onRubricSaved: (response: ActivityRubricResponse) => void;
  initialFollowup: ActivityFollowupResponse | null;
  onFollowupSaved: (response: ActivityFollowupResponse) => void;
}) {
  const loaded = loadDraft(
    userId,
    spaceId,
    packId,
    question.id,
    studySessionId,
  );
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
  const [gradeAfterSave, setGradeAfterSave] = useState(false);
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
      setStorageWarning(
        saveDraft(userId, spaceId, packId, question.id, draft, studySessionId),
      );
  }, [draft, packId, question.id, result, spaceId, studySessionId, userId]);
  const base = () => ({
    schemaVersion: 1 as const,
    attemptId: draft.attemptId,
    packId,
    questionId: question.id,
    confidence: draft.confidence || null,
    ...(studySessionId ? { studySessionId } : {}),
  });
  async function submit(input: Parameters<typeof saveActivityAttempt>[1]) {
    setBusy(true);
    setError("");
    try {
      const saved = await saveActivityAttempt(spaceId, input);
      setResult(saved);
      if (
        input.interaction === "explain_submit" ||
        input.interaction === "calculation_submit"
      )
        setGradeAfterSave(true);
      else
        setStorageWarning(
          clearDraft(userId, spaceId, packId, question.id, studySessionId),
        );
      onProgressChange();
      onAttemptSaved?.(saved);
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
      onProgressChange();
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
  return (
    <li className="activity-card">
      {sessionReason && (
        <p className="fine-print">Why this activity: {sessionReason}</p>
      )}
      <ActivityQuestionPrompt question={question} />
      {!result && question.type === "mcq" && (
        <MultipleChoiceAnswer
          question={question}
          selected={draft.selectedOptionId}
          busy={busy}
          flagged={Boolean(flag)}
          onSelect={(selectedOptionId) => update({ selectedOptionId })}
          onSubmit={() => {
            setLocalCorrectness(
              gradeMcq(draft.selectedOptionId, question.review.correctOptionId),
            );
            void submit({
              ...base(),
              interaction: "mcq_submit",
              selectedOptionId: draft.selectedOptionId,
            });
          }}
        />
      )}
      {!result &&
        question.type !== "mcq" &&
        question.type !== "calculation" && (
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
      {!result && (
        <ActivityConfidence
          value={draft.confidence}
          disabled={busy}
          onChange={(confidence) => update({ confidence })}
        />
      )}
      {!result && (
        <ActivityTutorActions
          spaceId={spaceId}
          packId={packId}
          questionId={question.id}
          initial={initialTutor}
          onSource={onSource}
          onSaved={onTutorSaved}
        />
      )}
      {!result && question.type === "calculation" && (
        <CalculationAnswer
          question={question}
          finalAnswer={draft.finalAnswer}
          working={draft.answer}
          busy={busy}
          flagged={Boolean(flag)}
          onChange={update}
          onInvalid={setError}
          onSubmit={(checked) => {
            setLocalCorrectness(checked);
            void submit({
              ...base(),
              interaction: "calculation_submit",
              finalAnswer: draft.finalAnswer,
              working: draft.answer,
            });
          }}
        />
      )}
      {!result &&
        (question.type === "explain" || question.type === "scenario") && (
          <>
            <button
              disabled={busy || Boolean(flag) || !draft.answer.trim()}
              onClick={() =>
                void submit({
                  ...base(),
                  interaction: "explain_submit",
                  answer: draft.answer,
                })
              }
            >
              Save{" "}
              {question.type === "scenario"
                ? "scenario response"
                : "explanation"}
            </button>
            {flag && (
              <p>
                This flagged question cannot be submitted for rubric feedback.
                Your draft remains available.
              </p>
            )}
          </>
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
        <AttemptFeedback
          result={result}
          question={question}
          localCorrectness={localCorrectness}
        />
      )}
      <ActivityGradedFeedback
        spaceId={spaceId}
        result={result}
        rubric={initialRubric}
        followup={initialFollowup}
        gradeNow={gradeAfterSave}
        onRubricSaved={(saved) => {
          onRubricSaved(saved);
          setStorageWarning(
            clearDraft(userId, spaceId, packId, question.id, studySessionId),
          );
        }}
        onFollowupSaved={onFollowupSaved}
        onSource={onSource}
      />
      <ActivityQuestionFooter
        question={question}
        busy={busy}
        flag={flag}
        onFlag={(reason) => void saveFlag(reason)}
        onSource={onSource}
      />
    </li>
  );
}
