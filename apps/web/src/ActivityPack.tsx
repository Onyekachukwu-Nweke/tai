import { useEffect, useState } from "react";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { generateActivityPack, loadActivityPack } from "./activity-pack-api";

type Source = LearnerActivityPack["questions"][number]["sources"][number];
export function ActivityPack({
  spaceId,
  selectedCount,
  onSource,
}: {
  spaceId: string;
  selectedCount: number;
  onSource: (source: Source) => void;
}) {
  const [pack, setPack] = useState<LearnerActivityPack | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadActivityPack(spaceId, controller.signal)
      .then(setPack)
      .catch(() =>
        setError("Saved activities could not be loaded. Retry explicitly."),
      );
    return () => controller.abort();
  }, [spaceId]);
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
  return (
    <section className="activity-pack" aria-labelledby="activity-heading">
      <h3 id="activity-heading">Practice activities</h3>
      <p className="notice">
        Development preview: these prompts come from a deterministic fake
        provider and have not been reviewed for teaching quality. Answers and
        grading are not available in this slice.
      </p>
      <button
        type="button"
        disabled={busy || selectedCount < 2}
        onClick={() => void prepare()}
      >
        {busy
          ? "Preparing activities…"
          : pack?.questions.length
            ? "Prepare another pack"
            : "Prepare activity pack"}
      </button>
      {selectedCount < 2 && (
        <p>Select at least two concepts to prepare a pack.</p>
      )}
      {pack?.status === "failed" && (
        <p>
          Previous preparation failed. Retry explicitly; the last saved pack
          remains below.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {pack && pack.questions.length > 0 && (
        <ol aria-label="Saved activity pack">
          {pack.questions.map((question) => (
            <li key={question.id} className="activity-card">
              <p>
                <strong>
                  {question.type === "mcq"
                    ? "Multiple choice"
                    : question.type === "recall"
                      ? "Recall"
                      : "Explain"}
                </strong>{" "}
                · about {question.estimatedMinutes} min
              </p>
              <p>{question.prompt}</p>
              {question.type === "mcq" && (
                <ul aria-label={`Options for ${question.prompt}`}>
                  {question.options.map((option) => (
                    <li key={option.id}>{option.text}</li>
                  ))}
                </ul>
              )}
              <ul aria-label={`Sources for ${question.prompt}`}>
                {question.sources.map((source) => (
                  <li key={source.id}>
                    <button
                      type="button"
                      className="source-link"
                      onClick={() => onSource(source)}
                    >
                      Open source section {source.location}:{" "}
                      {source.text.slice(0, 80)}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
