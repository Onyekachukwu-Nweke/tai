import { useEffect, useState } from "react";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { loadActivityPack } from "./activity-pack-api";
import { loadActivityState } from "./activity-attempt-api";
import type { ActivityAttemptResponse } from "../../../packages/contracts/activity-attempts";
import type {
  RecoveryOffer,
  StudySession as SavedSession,
} from "../../../packages/contracts/study-sessions";
import { loadStudySession } from "./study-session-api";
import { loadRecoveryOffer } from "./recovery-session-api";
import type { ActivityTutorResponse } from "../../../packages/contracts/activity-tutor";
import { loadTutorState } from "./activity-tutor-api";
import type { ActivityRubricResponse } from "../../../packages/contracts/activity-rubric";
import { loadRubricState } from "./activity-rubric-api";
import { useActivityFollowups } from "./use-activity-followups";
import { emptyStudySession } from "./empty-study-session";

/** Loads the saved pack and everything attached to it for the practice view. */
export function usePracticeState(spaceId: string) {
  const [pack, setPack] = useState<LearnerActivityPack | null>(null);
  const [attempts, setAttempts] = useState<
    Record<string, ActivityAttemptResponse>
  >({});
  const [flags, setFlags] = useState<Record<string, "incorrect" | "ambiguous">>(
    {},
  );
  const [error, setError] = useState("");
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
      .catch(
        () =>
          controller.signal.aborted ||
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
      .catch(
        () =>
          controller.signal.aborted ||
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
      .catch(
        () =>
          controller.signal.aborted ||
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
      .catch(
        () =>
          controller.signal.aborted ||
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
      .catch(
        () =>
          controller.signal.aborted ||
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
      .catch(
        () =>
          controller.signal.aborted ||
          setError(
            "Saved session could not be loaded. Retry by reopening this material.",
          ),
      );
    return () => controller.abort();
  }, [pack?.packId, spaceId]);
  async function refreshSession() {
    try {
      setSession(await loadStudySession(spaceId));
    } catch {
      setError(
        "The saved session state could not be refreshed. Reopen this material to retry.",
      );
    }
  }
  return {
    pack,
    setPack,
    attempts,
    setAttempts,
    flags,
    error,
    setError,
    session,
    setSession,
    recovery,
    setRecovery,
    tutor,
    setTutor,
    rubric,
    setRubric,
    followups,
    setFollowups,
    refreshSession,
  };
}
