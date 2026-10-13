import { useEffect, useRef, useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import { FocusShell } from "./FocusShell";
import { loadSelfRatings, saveSelfRating } from "./concept-self-ratings";
import { isEditing, useKeydown } from "./use-keydown";
import { Icon } from "./Icon";

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
  const [phase, setPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const [announcement, setAnnouncement] = useState("");
  const locked = useRef(false);
  const timers = useRef<number[]>([]);
  const total = concepts.length;
  const card = concepts[index];
  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );
  function later(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  }
  function next() {
    if (locked.current || !card) return;
    locked.current = true;
    setFlipped(false);
    setAnnouncement("");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIndex((value) => value + 1);
      locked.current = false;
      return;
    }
    setPhase("leaving");
    later(() => {
      setIndex((value) => value + 1);
      setPhase("entering");
      later(() => {
        setPhase("idle");
        locked.current = false;
      }, 260);
    }, 220);
  }
  function rate(value: number) {
    if (!card) return;
    setRatings(saveSelfRating(spaceId, card.id, value));
    setRated((current) => ({ ...current, [card.id]: value }));
    next();
  }
  useKeydown((event) => {
    if (!card || locked.current || isEditing(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!flipped && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      setFlipped(true);
      setAnnouncement(`Answer shown. ${card.description}`);
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
          <article className={`focus-card flashcard card-${phase}`}>
            <div className={`flashcard-inner${flipped ? " is-flipped" : ""}`}>
              <section
                className="flashcard-face flashcard-front"
                aria-hidden={flipped}
              >
                <p className="focus-label">Concept</p>
                <h2>{card.label}</h2>
                <p className="focus-hint">
                  Recall what this means in your own words, then flip the card.
                </p>
              </section>
              <section
                className="flashcard-face flashcard-back"
                aria-label="Answer"
                aria-hidden={!flipped}
              >
                {flipped && (
                  <>
                    <p className="focus-label">From your material</p>
                    <h2>{card.label}</h2>
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
                  </>
                )}
              </section>
            </div>
          </article>
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
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
                      disabled={phase !== "idle"}
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
                <button
                  type="button"
                  className="secondary"
                  disabled={phase !== "idle"}
                  onClick={next}
                >
                  Skip{" "}
                  <kbd aria-label="Right arrow key">
                    <Icon className="icon" name="arrow-right" size={13} />
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlipped(true);
                    setAnnouncement(`Answer shown. ${card.description}`);
                  }}
                >
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
