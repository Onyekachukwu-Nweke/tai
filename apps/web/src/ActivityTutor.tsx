import { useEffect, useRef, useState } from "react";
import type { ActivityTutorResponse } from "../../../packages/contracts/activity-tutor";
import { requestTutorHelp } from "./activity-tutor-api";

export function ActivityTutor({
  spaceId,
  packId,
  questionId,
  kind,
  initial,
  onSource,
  onSaved,
}: {
  spaceId: string;
  packId: string;
  questionId: string;
  kind: "hint" | "explain_again";
  initial: ActivityTutorResponse | null;
  onSource: (source: ActivityTutorResponse["sources"][number]) => void;
  onSaved: (response: ActivityTutorResponse) => void;
}) {
  const [result, setResult] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const label = kind === "hint" ? "Hint" : "Explain in simpler English";
  useEffect(() => {
    if (initial) setResult(initial);
  }, [initial]);

  async function request() {
    setBusy(true);
    setError("");
    try {
      const saved = await requestTutorHelp(spaceId, {
        schemaVersion: 1,
        requestId: crypto.randomUUID(),
        packId,
        questionId,
        kind,
      });
      setResult(saved);
      onSaved(saved);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Tutor help could not be prepared. Retry explicitly.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tutor-action">
      {!result && (
        <button
          className="ghost"
          disabled={busy}
          onClick={() => void request()}
        >
          {busy
            ? `${label} loading…`
            : error
              ? `Retry ${label.toLowerCase()}`
              : label}
        </button>
      )}
      {busy && <p role="status">Preparing {label.toLowerCase()}…</p>}
      {error && (
        <p role="alert" className="error">
          {error} Retry explicitly; your response remains unchanged.
        </p>
      )}
      {result && (
        <div className="notice" ref={resultRef} tabIndex={-1} role="status">
          <p>
            <strong>Supported by your material:</strong> {result.text}
          </p>
          <ul
            className="source-chips"
            aria-label={`Sources for ${label.toLowerCase()}`}
          >
            {result.sources.map((source) => (
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
        </div>
      )}
    </div>
  );
}
