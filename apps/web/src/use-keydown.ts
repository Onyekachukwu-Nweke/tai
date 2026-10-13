import { useEffect, useRef } from "react";

export function isEditing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Document-level shortcut listener that always calls the latest handler. */
export function useKeydown(
  handler: (event: KeyboardEvent) => void,
  enabled = true,
) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => latest.current(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [enabled]);
}
