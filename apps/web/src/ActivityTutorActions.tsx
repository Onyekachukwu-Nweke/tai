import type { ActivityTutorResponse } from "../../../packages/contracts/activity-tutor";
import { ActivityTutor } from "./ActivityTutor";

export function ActivityTutorActions({
  spaceId,
  packId,
  questionId,
  initial,
  onSource,
  onSaved,
}: {
  spaceId: string;
  packId: string;
  questionId: string;
  initial: ActivityTutorResponse[];
  onSource: (source: ActivityTutorResponse["sources"][number]) => void;
  onSaved: (response: ActivityTutorResponse) => void;
}) {
  return (
    <div className="preview-actions" aria-label="Tutor help">
      {(["hint", "explain_again"] as const).map((kind) => (
        <ActivityTutor
          key={kind}
          spaceId={spaceId}
          packId={packId}
          questionId={questionId}
          kind={kind}
          initial={initial.find((item) => item.kind === kind) ?? null}
          onSource={onSource}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}
