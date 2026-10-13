import { useState } from "react";
import { ConceptExplorer } from "./ConceptExplorer";
import { CitationPanel, type Citation } from "./CitationPanel";
import type { MaterialPreview } from "./material/types";
import { conceptScopes } from "./concept-scopes";

export function PracticeWorkspaceView({
  userId,
  spaceId,
  preview,
  onLocation,
}: {
  title: string;
  userId: string;
  spaceId: string;
  preview: MaterialPreview;
  onLocation: (index: number) => void;
}) {
  const [citation, setCitation] = useState<Citation | null>(null);
  return (
    <>
      <ConceptExplorer
        userId={userId}
        spaceId={spaceId}
        scopes={conceptScopes(preview)}
        practiceOnly
        onSource={(source) => {
          const index = preview.sections.findIndex(
            (item) => item.location === source.location,
          );
          if (index >= 0) onLocation(index);
          setCitation(source);
        }}
      />
      {citation && (
        <CitationPanel
          citation={citation}
          unit={preview.format === "pdf" ? "page" : "section"}
          onClose={() => setCitation(null)}
        />
      )}
    </>
  );
}
