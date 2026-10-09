import { useEffect, useState } from "react";
import type { ActivityFollowupResponse } from "../../../packages/contracts/activity-followup";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { loadActivityFollowups } from "./activity-followup-api";

export function useActivityFollowups(
  spaceId: string,
  pack: LearnerActivityPack | null,
  onError: (message: string) => void,
) {
  const [followups, setFollowups] = useState<ActivityFollowupResponse[]>([]);
  const packId = pack?.packId;
  const supportsFollowup = pack?.questions.some(
    (item) => item.type === "explain" || item.type === "scenario",
  );
  useEffect(() => {
    if (!packId || !supportsFollowup) return;
    const controller = new AbortController();
    loadActivityFollowups(spaceId, packId, controller.signal)
      .then((state) => setFollowups(state.followups))
      .catch(() =>
        onError(
          "Saved targeted follow-up could not be loaded. Retry by reopening this material.",
        ),
      );
    return () => controller.abort();
  }, [packId, spaceId, supportsFollowup, onError]);
  return [followups, setFollowups] as const;
}
