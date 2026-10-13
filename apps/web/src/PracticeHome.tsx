import { useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import { ActivityPack } from "./ActivityPack";
import { FlashcardsCard } from "./FlashcardsCard";
import { ConceptProgress } from "./ConceptProgress";
import { PracticalTask } from "./PracticalTask";

type Concept = ConceptCollection["concepts"][number];
type Source = Concept["sources"][number];

export function PracticeHome({
  spaceId,
  userId,
  concepts,
  loadError,
  onSource,
}: {
  spaceId: string;
  userId: string;
  concepts: Concept[];
  loadError: string;
  onSource: (source: Source) => void;
}) {
  const [revision, setRevision] = useState(0);
  const selected = concepts.filter((concept) => concept.selected);
  const labels = selected.map(({ id, label }) => ({ id, label }));
  return (
    <section className="practice-home" aria-label="Practice">
      {loadError && (
        <p role="alert" className="error">
          {loadError}
        </p>
      )}
      {concepts.length === 0 ? (
        <p role="status">
          No saved concepts are ready. Open the Study Space view to prepare
          concepts first.
        </p>
      ) : (
        <>
          <header className="practice-intro">
            <p className="eyebrow">Active learning</p>
            <h2>Strengthen what you understand.</h2>
            <p>
              {selected.length} selected concept
              {selected.length === 1 ? "" : "s"}, ready for active recall.
            </p>
          </header>
          <div className="practice-primary">
            <ActivityPack
              userId={userId}
              spaceId={spaceId}
              selectedCount={selected.length}
              concepts={labels}
              onSource={onSource}
              onProgressChange={() => setRevision((value) => value + 1)}
            />
          </div>
          <section
            className="practice-secondary"
            aria-labelledby="quick-practice-title"
          >
            <div className="section-heading-inline">
              <div>
                <p className="eyebrow">Quick practice</p>
                <h2 id="quick-practice-title">Keep the ideas moving.</h2>
              </div>
            </div>
            <FlashcardsCard
              spaceId={spaceId}
              concepts={selected}
              onSource={onSource}
              onClose={() => setRevision((value) => value + 1)}
            />
          </section>
          <section
            className="more-learning"
            aria-labelledby="more-learning-title"
          >
            <header>
              <p className="eyebrow">More ways to learn</p>
              <h2 id="more-learning-title">Review and apply</h2>
            </header>
            <ConceptProgress spaceId={spaceId} revision={revision} />
            <PracticalTask
              spaceId={spaceId}
              concepts={labels}
              sources={concepts.flatMap((concept) => concept.sources)}
              onSource={onSource}
            />
          </section>
        </>
      )}
    </section>
  );
}
