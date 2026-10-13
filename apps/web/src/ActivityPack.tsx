import { useEffect, useState } from "react";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { generateActivityPack, loadActivityPack } from "./activity-pack-api";
import { ActivityQuestion } from "./ActivityQuestion";
import { loadActivityState } from "./activity-attempt-api";
import type { ActivityAttemptResponse } from "../../../packages/contracts/activity-attempts";
import { ConceptProgress } from "./ConceptProgress";
import type { StudySession as SavedSession } from "../../../packages/contracts/study-sessions";
import { loadStudySession } from "./study-session-api";
import { StudySession } from "./StudySession";
import type { RecoveryOffer } from "../../../packages/contracts/study-sessions";
import { loadRecoveryOffer } from "./recovery-session-api";
import { RecoveryReturn } from "./RecoveryReturn";
import type { ActivityTutorResponse } from "../../../packages/contracts/activity-tutor";
import { loadTutorState } from "./activity-tutor-api";
import type { ActivityRubricResponse } from "../../../packages/contracts/activity-rubric";
import { loadRubricState } from "./activity-rubric-api";
import { useActivityFollowups } from "./use-activity-followups";
import { emptyStudySession } from "./empty-study-session";
import { PracticePackHeader } from "./PracticePackHeader";

type Source = LearnerActivityPack["questions"][number]["sources"][number];
export function ActivityPack({
  spaceId,
  userId,
  selectedCount,
  concepts,
  onSource,
}: {
  spaceId: string;
  userId: string;
  selectedCount: number;
  concepts: Array<{ id: string; label: string }>;
  onSource: (source: Source) => void;
}) {
  const [pack, setPack] = useState<LearnerActivityPack | null>(null);
  const [attempts, setAttempts] = useState<
    Record<string, ActivityAttemptResponse>
  >({});
  const [flags, setFlags] = useState<Record<string, "incorrect" | "ambiguous">>(
    {},
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [progressRevision, setProgressRevision] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [session, setSession] = useState<SavedSession>(emptyStudySession);
  const [recovery, setRecovery] = useState<RecoveryOffer | null>(null);
  const [tutor, setTutor] = useState<ActivityTutorResponse[]>([]);
  const [rubric, setRubric] = useState<ActivityRubricResponse[]>([]);
  const [followups, setFollowups] = useActivityFollowups(
    spaceId,
    pack,
    setError,
  );
  useEffect(() => {
    const controller = new AbortController();
    loadActivityPack(spaceId, controller.signal)
      .then(setPack)
      .catch(() =>
        setError("Saved activities could not be loaded. Retry explicitly."),
      );
    return () => controller.abort();
  }, [spaceId]);
  useEffect(() => {
    if (!pack?.packId) return;
    const controller = new AbortController();
    loadActivityState(spaceId, pack.packId, controller.signal)
      .then((state) => {
        setAttempts(
          Object.fromEntries(
            state.attempts.map((item) => [item.questionId, item.result]),
          ),
        );
        setFlags(
          Object.fromEntries(
            state.flags.map((item) => [item.questionId, item.reason]),
          ),
        );
      })
      .catch(() =>
        setError(
          "Saved practice state could not be loaded. Retry by reopening this material.",
        ),
      );
    return () => controller.abort();
  }, [pack?.packId, spaceId]);
  useEffect(() => {
    if (
      !pack?.packId ||
      !pack.questions.some(
        (item) =>
          item.type === "explain" ||
          item.type === "scenario" ||
          item.type === "calculation",
      )
    )
      return;
    const controller = new AbortController();
    loadRubricState(spaceId, pack.packId, controller.signal)
      .then((state) => setRubric(state.grades))
      .catch(() =>
        setError(
          "Saved rubric feedback could not be loaded. Retry by reopening this material.",
        ),
      );
    return () => controller.abort();
  }, [pack?.packId, spaceId]);
  useEffect(() => {
    if (!pack?.packId) return;
    const controller = new AbortController();
    loadTutorState(spaceId, pack.packId, controller.signal)
      .then((state) => setTutor(state.interactions))
      .catch(() =>
        setError(
          "Saved tutor help could not be loaded. Retry by reopening this material.",
        ),
      );
    return () => controller.abort();
  }, [pack?.packId, spaceId]);
  useEffect(() => {
    if (!pack?.packId) return;
    const controller = new AbortController();
    loadRecoveryOffer(spaceId, controller.signal)
      .then(setRecovery)
      .catch(() =>
        setError(
          "Return options could not be loaded. Retry by reopening this material.",
        ),
      );
    return () => controller.abort();
  }, [pack?.packId, spaceId]);
  useEffect(() => {
    const controller = new AbortController();
    loadStudySession(spaceId, controller.signal)
      .then(setSession)
      .catch(() =>
        setError(
          "Saved session could not be loaded. Retry by reopening this material.",
        ),
      );
    return () => controller.abort();
  }, [pack?.packId, spaceId]);
  useEffect(() => {
    setQuestionIndex((current) =>
      Math.min(current, Math.max(0, session.items.length - 1)),
    );
  }, [pack?.packId, session.sessionId, session.items.length]);
  async function refreshSession() {
    try {
      setSession(await loadStudySession(spaceId));
    } catch {
      setError(
        "The saved session state could not be refreshed. Reopen this material to retry.",
      );
    }
  }
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      setPack(await generateActivityPack(spaceId, crypto.randomUUID()));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Activities could not be prepared. Retry explicitly.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="activity-pack" aria-labelledby="activity-heading">
      {pack && pack.questions.length > 0 && (
        <StudySession
          spaceId={spaceId}
          concepts={concepts}
          session={
            session.packId && session.packId !== pack.packId
              ? emptyStudySession
              : session
          }
          onChange={setSession}
        />
      )}
      <PracticePackHeader
        busy={busy}
        selectedCount={selectedCount}
        hasPack={Boolean(pack?.questions.length)}
        failed={pack?.status === "failed"}
        error={error}
        onPrepare={() => void prepare()}
      />
      <ConceptProgress spaceId={spaceId} revision={progressRevision} />
      {pack && recovery && (
        <RecoveryReturn
          spaceId={spaceId}
          offer={recovery}
          onSession={(nextSession) => {
            setSession(nextSession);
            setRecovery(null);
          }}
        />
      )}
      {pack &&
        session.status === "active" &&
        session.packId === pack.packId && (
          <>
            <div className="activity-toolbar">
              <strong>
                Question {Math.min(questionIndex + 1, session.items.length)} of{" "}
                {session.items.length}
              </strong>
              <progress
                value={questionIndex + 1}
                max={session.items.length}
                aria-label="Session progress"
              />
              <span>
                {Math.max(0, session.estimatedMinutes - questionIndex * 2)}m
                remaining
              </span>
            </div>
            <ol className="activity-stage" aria-label="Saved activity pack">
              {session.items
                .map((item) =>
                  pack.questions.find(
                    (question) => question.id === item.questionId,
                  ),
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
                      onProgressChange={() =>
                        setProgressRevision((value) => value + 1)
                      }
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
                            grade.attemptId ===
                            attempts[question.id]?.attemptId,
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
                            followup.attemptId ===
                            attempts[question.id]?.attemptId,
                        ) ?? null
                      }
                      onFollowupSaved={(saved) =>
                        setFollowups((current) => [
                          ...current.filter(
                            (followup) =>
                              followup.attemptId !== saved.attemptId,
                          ),
                          saved,
                        ])
                      }
                    />
                  );
                })}
            </ol>
            <div className="question-nav">
              <button
                className="secondary"
                disabled={questionIndex === 0}
                onClick={() =>
                  setQuestionIndex((value) => Math.max(0, value - 1))
                }
              >
                ← Previous
              </button>
              <button
                disabled={questionIndex >= session.items.length - 1}
                onClick={() =>
                  setQuestionIndex((value) =>
                    Math.min(session.items.length - 1, value + 1),
                  )
                }
              >
                Next →
              </button>
            </div>
          </>
        )}
    </section>
  );
}
