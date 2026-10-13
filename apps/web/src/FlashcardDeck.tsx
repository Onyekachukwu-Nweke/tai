import { useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import { FocusShell } from "./FocusShell";
import { loadSelfRatings, saveSelfRating } from "./concept-self-ratings";
import { isEditing, useKeydown } from "./use-keydown";

type Concept = ConceptCollection["concepts"][number];
type Source = Concept["sources"][number];

export function FlashcardDeck({
  spaceId,
  concepts,
  onSource,
  onExit,
}: {
  spaceId: string;
  concepts: Concept[];
  onSource: (source: Source) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState(() => loadSelfRatings(spaceId));
  const [rated, setRated] = useState<Record<string, number>>({});
  const total = concepts.length;
  const card = concepts[index];
  function next() {
    setFlipped(false);
    setIndex((value) => value + 1);
  }
  function rate(value: number) {
    if (!card) return;
    setRatings(saveSelfRating(spaceId, card.id, value));
    setRated((current) => ({ ...current, [card.id]: value }));
    next();
  }
  useKeydown((event) => {
    if (!card || isEditing(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!flipped && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      setFlipped(true);
    } else if (flipped && /^[1-5]$/.test(event.key)) {
      event.preventDefault();
      rate(Number(event.key));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  });
  return (
    <FocusShell
      label="Flashcards"
      current={Math.min(index + 1, total)}
      total={total}
      onExit={onExit}
    >
      {!card ? (
        <div className="focus-done">
          <h2>Deck complete</h2>
          <p>
            You rated {Object.keys(rated).length} of {total} cards. Ratings stay
            in this browser and never change saved review evidence.
          </p>
          <div className="focus-actions">
            <button
              className="secondary"
              onClick={() => {
                setRated({});
                setIndex(0);
              }}
            >
              Go again
            </button>
            <button onClick={onExit}>Done</button>
          </div>
        </div>
      ) : (
        <>
          <article className="focus-card flashcard" aria-live="polite">
            <p className="focus-label">Concept</p>
            <h2>{card.label}</h2>
            {flipped ? (
              <section className="flashcard-back" aria-label="Answer">
                <p className="focus-label">From your material</p>
                <p>{card.description}</p>
                <ul className="source-chips" aria-label="Sources">
                  {card.sources.map((source) => (
                    <li key={source.id}>
                      <button
                        type="button"
                        className="source-chip"
                        aria-label={`Open source page ${source.location}`}
                        onClick={() => onSource(source)}
                      >
                        Page {source.location}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="focus-hint">
                Recall what this means in your own words, then flip the card.
              </p>
            )}
          </article>
          <footer className="focus-footer flashcard-footer">
            {flipped ? (
              <div
                className="rating"
                role="group"
                aria-label="How well did you know it?"
              >
                <span className="rating-prompt">How well did you know it?</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="star"
                      aria-label={`Rate ${value} out of 5`}
                      onClick={() => rate(value)}
                    >
                      <span aria-hidden="true">★</span>
                      <kbd>{value}</kbd>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="focus-actions">
                <button type="button" className="secondary" onClick={next}>
                  Skip <kbd>→</kbd>
                </button>
                <button type="button" onClick={() => setFlipped(true)}>
                  Flip card <kbd>space</kbd>
                </button>
              </div>
            )}
            <span className="focus-meta">
              {ratings[card.id]
                ? `Last rating ${ratings[card.id]}/5`
                : "Not rated yet"}
            </span>
          </footer>
        </>
      )}
    </FocusShell>
  );
}
