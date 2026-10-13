import { useEffect, useRef, type ReactNode } from "react";
import { useKeydown } from "./use-keydown";

export function FocusShell({
  label,
  current,
  total,
  onExit,
  children,
}: {
  label: string;
  current: number;
  total: number;
  onExit: () => void;
  children: ReactNode;
}) {
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.classList.add("focus-open");
    shell.current?.focus();
    return () => {
      document.body.classList.remove("focus-open");
      opener?.focus();
    };
  }, []);
  useKeydown((event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (document.querySelector("dialog[open]")) return;
    event.preventDefault();
    onExit();
  });
  const percent = total ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div
      className="focus-shell"
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      ref={shell}
    >
      <header className="focus-header">
        <span className="focus-brand" aria-hidden="true">
          TAI
        </span>
        <div className="focus-progress">
          <span className="focus-count">
            <strong>{current}</strong> / {total}
          </span>
          <div
            className="focus-bar"
            role="progressbar"
            aria-label={`${label} progress`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={current}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        <button type="button" className="focus-exit" onClick={onExit}>
          Exit <kbd>esc</kbd>
        </button>
      </header>
      <div className="focus-body">{children}</div>
    </div>
  );
}
