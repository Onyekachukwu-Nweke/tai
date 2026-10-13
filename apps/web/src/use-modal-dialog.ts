import { useRef, type KeyboardEvent } from "react";
const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  function open() {
    dialogRef.current?.showModal();
    requestAnimationFrame(() =>
      dialogRef.current?.querySelector<HTMLElement>(focusable)?.focus(),
    );
  }
  function close() {
    dialogRef.current?.close();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function trap(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const items = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(focusable) ?? []),
    ];
    if (!items.length) return;
    const first = items[0]!,
      last = items.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return { dialogRef, triggerRef, open, close, trap };
}
