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
import { RecallCheck } from "./RecallCheck";
import { QuestionActions } from "./QuestionActions";
import { useKeydown } from "./use-keydown";
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
  initialTutor = [],
  onTutorSaved,
  initialRubric,
  onRubricSaved,
  initialFollowup,
  onFollowupSaved,
  active = true,
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
  initialTutor?: ActivityTutorResponse[];
  onTutorSaved: (response: ActivityTutorResponse) => void;
  initialRubric: ActivityRubricResponse | null;
  onRubricSaved: (response: ActivityRubricResponse) => void;
  initialFollowup: ActivityFollowupResponse | null;
  onFollowupSaved: (response: ActivityFollowupResponse) => void;
  active?: boolean;
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
  const recall = question.type === "recall";
  const written = question.type === "explain" || question.type === "scenario";
  const hasAnswer = Boolean(draft.answer.trim());
  function seeAnswer() {
    if (hasAnswer) setCheckingRecall(true);
    else void submit({ ...base(), interaction: "reveal" });
  }
  function checkWritten() {
    void submit({
      ...base(),
      interaction: "explain_submit",
      answer: draft.answer,
    });
  }
  useKeydown((event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter" || busy)
      return;
    if (recall && !checkingRecall) {
      event.preventDefault();
      seeAnswer();
    } else if (written && hasAnswer && !flag) {
      event.preventDefault();
      checkWritten();
    }
  }, active && !result);
  return (
    <li className="activity-card focus-card" hidden={!active}>
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
      {!result && (recall || written) && (
        <label className="response-field">
          {recall ? "Your response (optional)" : "Your response"}
          <textarea
            value={draft.answer}
            disabled={busy || checkingRecall}
            maxLength={8000}
            placeholder={
              recall
                ? "Write what you remember before you look…"
                : "Write your answer…"
            }
            onChange={(e) => update({ answer: e.target.value })}
          />
        </label>
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
      {!result && recall && checkingRecall && (
        <RecallCheck
          supportedAnswer={question.review.supportedAnswer}
          busy={busy}
          active={active}
          onAssess={(selfAssessment) =>
            void submit({
              ...base(),
              interaction: "recall_self_check",
              answer: draft.answer,
              selfAssessment,
            })
          }
        />
      )}
      {!result && (
        <QuestionActions
          type={question.type}
          busy={busy}
          flagged={Boolean(flag)}
          hasAnswer={hasAnswer}
          checkingRecall={checkingRecall}
          onSkip={() => void submit({ ...base(), interaction: "skip" })}
          onReveal={() => void submit({ ...base(), interaction: "reveal" })}
          onSeeAnswer={seeAnswer}
          onCheckWritten={checkWritten}
        >
          <ActivityConfidence
            value={draft.confidence}
            disabled={busy}
            onChange={(confidence) => update({ confidence })}
          />
          <ActivityTutorActions
            spaceId={spaceId}
            packId={packId}
            questionId={question.id}
            initial={initialTutor}
            onSource={onSource}
            onSaved={onTutorSaved}
          />
        </QuestionActions>
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
