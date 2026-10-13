import { useEffect, useState } from "react";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { generateActivityPack } from "./activity-pack-api";
import { StudySession } from "./StudySession";
import { RecoveryReturn } from "./RecoveryReturn";
import { emptyStudySession } from "./empty-study-session";
import { PracticePackHeader } from "./PracticePackHeader";
import { usePracticeState } from "./use-practice-state";
import { FocusShell } from "./FocusShell";
import { PracticeStage } from "./PracticeStage";

type Source = LearnerActivityPack["questions"][number]["sources"][number];
export function ActivityPack({
  spaceId,
  userId,
  selectedCount,
  concepts,
  onSource,
  onProgressChange,
}: {
  spaceId: string;
  userId: string;
  selectedCount: number;
  concepts: Array<{ id: string; label: string }>;
  onSource: (source: Source) => void;
  onProgressChange: () => void;
}) {
  const state = usePracticeState(spaceId);
  const { pack, setPack, error, setError, session, setSession } = state;
  const [busy, setBusy] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    setQuestionIndex((current) =>
      Math.min(current, Math.max(0, session.items.length - 1)),
    );
  }, [pack?.packId, session.sessionId, session.items.length]);
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
  const sessionPack =
    pack?.packId && session.packId === pack.packId && session.items.length
      ? { ...pack, packId: pack.packId }
      : null;
  const active = Boolean(sessionPack && session.status === "active");
  const answered = session.items.filter((item) => item.completedAt).length;
  return (
    <section
      className="practice-mode activity-pack"
      aria-labelledby="activity-heading"
    >
      <PracticePackHeader
        busy={busy}
        selectedCount={selectedCount}
        hasPack={Boolean(pack?.questions.length)}
        failed={pack?.status === "failed"}
        error={error}
        onPrepare={() => void prepare()}
      />
      {pack && state.recovery && (
        <RecoveryReturn
          spaceId={spaceId}
          offer={state.recovery}
          onSession={(nextSession) => {
            setSession(nextSession);
            state.setRecovery(null);
            setQuestionIndex(0);
            setFocus(true);
          }}
        />
      )}
      {active && (
        <button className="resume-session" onClick={() => setFocus(true)}>
          Resume session ▶
          <span>
            {answered} of {session.items.length} answered
          </span>
        </button>
      )}
      {pack && pack.questions.length > 0 && (
        <StudySession
          spaceId={spaceId}
          concepts={concepts}
          session={
            session.packId && session.packId !== pack.packId
              ? emptyStudySession
              : session
          }
          onChange={(next) => {
            setSession(next);
            if (next.status === "active") {
              setQuestionIndex(0);
              setFocus(true);
            }
          }}
        />
      )}
      {focus && sessionPack && (
        <FocusShell
          label="Practice session"
          current={Math.min(questionIndex + 1, session.items.length)}
          total={session.items.length}
          onExit={() => setFocus(false)}
        >
          <PracticeStage
            state={state}
            pack={sessionPack}
            userId={userId}
            spaceId={spaceId}
            questionIndex={questionIndex}
            onQuestionIndex={setQuestionIndex}
            onProgressChange={onProgressChange}
            onSource={onSource}
            onFinish={() => setFocus(false)}
          />
        </FocusShell>
      )}
    </section>
  );
}
