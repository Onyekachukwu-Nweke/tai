import { useEffect, useRef } from "react";
import { isEditing, useKeydown } from "./use-keydown";

type Assessment = "not_yet" | "partial" | "remembered";
const options: Array<[Assessment, string, string]> = [
  ["not_yet", "Not yet", "1"],
  ["partial", "Partial", "2"],
  ["remembered", "Remembered", "3"],
];

export function RecallCheck({
  supportedAnswer,
  busy,
  active,
  onAssess,
}: {
  supportedAnswer: string;
  busy: boolean;
  active: boolean;
  onAssess: (value: Assessment) => void;
}) {
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    if (active) region.current?.focus();
  }, [active]);
  useKeydown((event) => {
    if (busy || isEditing(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const option = options.find(([, , key]) => key === event.key);
    if (!option) return;
    event.preventDefault();
    onAssess(option[0]);
  }, active);
  return (
    <section
      className="answer-reveal"
      aria-label="Supported answer"
      tabIndex={-1}
      ref={region}
    >
      <p className="focus-label">Supported by your material:</p>
      <p className="answer-text">{supportedAnswer}</p>
      <p className="assess-prompt">How did your answer compare?</p>
      <div className="assess-options">
        {options.map(([value, label, key]) => (
          <button
            key={value}
            type="button"
            className={`assess assess-${value}`}
            disabled={busy}
            onClick={() => onAssess(value)}
          >
            {label} <kbd aria-hidden="true">{key}</kbd>
          </button>
        ))}
      </div>
    </section>
  );
}
