import type { ActivityAttemptResponse } from "../../../packages/contracts/activity-attempts";
import type { ActivityFollowupResponse } from "../../../packages/contracts/activity-followup";
import type { ActivityRubricResponse } from "../../../packages/contracts/activity-rubric";
import { ActivityFollowup } from "./ActivityFollowup";
import { ActivityRubricFeedback } from "./ActivityRubricFeedback";

export function ActivityGradedFeedback({
  spaceId,
  result,
  rubric,
  followup,
  gradeNow,
  onRubricSaved,
  onFollowupSaved,
  onSource,
}: {
  spaceId: string;
  result: ActivityAttemptResponse | null;
  rubric: ActivityRubricResponse | null;
  followup: ActivityFollowupResponse | null;
  gradeNow: boolean;
  onRubricSaved: (saved: ActivityRubricResponse) => void;
  onFollowupSaved: (saved: ActivityFollowupResponse) => void;
  onSource: (source: ActivityRubricResponse["sources"][number]) => void;
}) {
  if (result?.interaction !== "explain_submit") return null;
  return (
    <>
      <ActivityRubricFeedback
        spaceId={spaceId}
        attemptId={result.attemptId}
        initial={rubric}
        gradeNow={gradeNow}
        onSaved={onRubricSaved}
        onSource={onSource}
      />
      {rubric && (
        <ActivityFollowup
          spaceId={spaceId}
          attemptId={result.attemptId}
          initial={followup}
          onSaved={onFollowupSaved}
          onSource={onSource}
        />
      )}
    </>
  );
}
