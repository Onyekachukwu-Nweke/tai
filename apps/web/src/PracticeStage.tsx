import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { ActivityQuestion } from "./ActivityQuestion";
import type { usePracticeState } from "./use-practice-state";
import { isEditing, useKeydown } from "./use-keydown";

type Source = LearnerActivityPack["questions"][number]["sources"][number];

export function PracticeStage({
  state,
  pack,
  userId,
  spaceId,
  questionIndex,
  onQuestionIndex,
  onProgressChange,
  onSource,
  onFinish,
}: {
  state: ReturnType<typeof usePracticeState>;
  pack: LearnerActivityPack & { packId: string };
  userId: string;
  spaceId: string;
  questionIndex: number;
  onQuestionIndex: (index: number) => void;
  onProgressChange: () => void;
  onSource: (source: Source) => void;
  onFinish: () => void;
}) {
  const {
    session,
    attempts,
    setAttempts,
    flags,
    tutor,
    setTutor,
    rubric,
    setRubric,
    followups,
    setFollowups,
    refreshSession,
  } = state;
  const last = session.items.length - 1;
  const answered = session.items.filter(
    (item) => item.completedAt || attempts[item.questionId],
  ).length;
  useKeydown((event) => {
    if (isEditing(event.target) || event.metaKey || event.ctrlKey) return;
    if (event.key === "ArrowRight" && questionIndex < last) {
      event.preventDefault();
      onQuestionIndex(questionIndex + 1);
    } else if (event.key === "ArrowLeft" && questionIndex > 0) {
      event.preventDefault();
      onQuestionIndex(questionIndex - 1);
    }
  });
  return (
    <div className="focus-stage">
      <ol className="activity-stage" aria-label="Saved activity pack">
        {session.items
          .map((item) =>
            pack.questions.find((question) => question.id === item.questionId),
          )
          .filter((question): question is NonNullable<typeof question> =>
            Boolean(question),
          )
          .map((question, visibleIndex) => {
            const item = session.items.find(
              (entry) => entry.questionId === question.id,
            )!;
            return (
              <ActivityQuestion
                key={`${session.sessionId}:${question.id}`}
                active={visibleIndex === questionIndex}
                userId={userId}
                spaceId={spaceId}
                packId={pack.packId!}
                question={question}
                onSource={onSource}
                initialResult={
                  session.kind !== "recovery" || item.completedAt
                    ? (attempts[question.id] ?? null)
                    : null
                }
                initialFlag={flags[question.id] ?? null}
                onProgressChange={() => onProgressChange()}
                studySessionId={session.sessionId!}
                onAttemptSaved={(saved) => {
                  setAttempts((current) => ({
                    ...current,
                    [question.id]: saved,
                  }));
                  void refreshSession();
                }}
                initialTutor={tutor.filter(
                  (interaction) => interaction.questionId === question.id,
                )}
                onTutorSaved={(saved) =>
                  setTutor((current) => [
                    ...current.filter(
                      (item) =>
                        item.questionId !== saved.questionId ||
                        item.kind !== saved.kind,
                    ),
                    saved,
                  ])
                }
                initialRubric={
                  rubric.find(
                    (grade) =>
                      grade.attemptId === attempts[question.id]?.attemptId,
                  ) ?? null
                }
                onRubricSaved={(saved) =>
                  setRubric((current) => [
                    ...current.filter(
                      (grade) => grade.attemptId !== saved.attemptId,
                    ),
                    saved,
                  ])
                }
                initialFollowup={
                  followups.find(
                    (followup) =>
                      followup.attemptId === attempts[question.id]?.attemptId,
                  ) ?? null
                }
                onFollowupSaved={(saved) =>
                  setFollowups((current) => [
                    ...current.filter(
                      (followup) => followup.attemptId !== saved.attemptId,
                    ),
                    saved,
                  ])
                }
              />
            );
          })}
      </ol>
      <nav className="question-nav" aria-label="Question navigation">
        <button
          className="ghost"
          disabled={questionIndex === 0}
          onClick={() => onQuestionIndex(questionIndex - 1)}
        >
          ← Previous
        </button>
        <span className="focus-meta">
          {answered} of {session.items.length} answered · no timer
        </span>
        {questionIndex < last ? (
          <button
            className="secondary"
            onClick={() => onQuestionIndex(questionIndex + 1)}
          >
            Next →
          </button>
        ) : (
          <button onClick={onFinish}>Finish ✓</button>
        )}
      </nav>
    </div>
  );
}
