import { useEffect, useRef, useState } from "react";
import { DeleteStudySpace } from "./DeleteStudySpace";
export function SpaceCardMenu({
  id,
  title,
  deletionPending,
  onPreview,
  onDeleting,
  onDeleted,
}: {
  id: string;
  title: string;
  deletionPending?: boolean;
  onPreview: () => void;
  onDeleting: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="space-menu" ref={root}>
      <button
        ref={menuTrigger}
        className="secondary"
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="ghost"
            disabled={deletionPending}
            aria-disabled={deletionPending || undefined}
            onClick={() => {
              if (deletionPending) return;
              setOpen(false);
              onPreview();
            }}
          >
            Preview material
          </button>
          <DeleteStudySpace
            deletionPending={deletionPending}
            spaceId={id}
            title={title}
            onDeleting={onDeleting}
            onDeleted={onDeleted}
            restoreFocus={() => menuTrigger.current?.focus()}
          />
        </div>
      )}
    </div>
  );
}
