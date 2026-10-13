import { useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import { FlashcardDeck } from "./FlashcardDeck";

type Concept = ConceptCollection["concepts"][number];

export function FlashcardsCard({
  spaceId,
  concepts,
  onSource,
  onClose,
}: {
  spaceId: string;
  concepts: Concept[];
  onSource: (source: Concept["sources"][number]) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = concepts.length;
  return (
    <section
      className="card practice-mode"
      aria-labelledby="flashcards-heading"
    >
      <p className="eyebrow">Instant · no AI</p>
      <h3 id="flashcards-heading">Flashcards</h3>
      <p className="fine-print">
        {count} card{count === 1 ? "" : "s"} from your selected concepts. Flip
        each card, then rate how well you knew it.
      </p>
      <button disabled={!count} onClick={() => setOpen(true)}>
        Start flashcards ▶
      </button>
      {open && (
        <FlashcardDeck
          spaceId={spaceId}
          concepts={concepts}
          onSource={onSource}
          onExit={() => {
            setOpen(false);
            onClose();
          }}
        />
      )}
    </section>
  );
}
