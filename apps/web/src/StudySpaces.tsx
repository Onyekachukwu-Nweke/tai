import { useEffect, useState, type FormEvent } from "react";
import {
  studySpaceListSchema,
  studySpaceResponseSchema,
} from "../../../packages/contracts/study-spaces";
import { api, ApiError, authClient } from "./api";
import { MaterialWorkspace } from "./MaterialWorkspace";
import { SpaceCardMenu } from "./SpaceCardMenu";

type Space = {
  id: string;
  title: string;
  createdAt: string;
  deletionPending?: boolean;
};

export function StudySpaces({
  userId,
  initialPractice = false,
  onViewChange,
}: {
  userId: string;
  initialPractice?: boolean;
  onViewChange?: (view: "home" | "spaces" | "practice" | "settings") => void;
}) {
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api("/api/study-spaces", studySpaceListSchema)
      .then((result) => {
        if (active) setSpaces(result.spaces);
      })
      .catch((reason: unknown) => {
        if (active) {
          setExpired(reason instanceof ApiError && reason.status === 401);
          setError(
            reason instanceof ApiError
              ? reason.message
              : "Your study spaces could not be loaded. Please retry.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  async function createSpace(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/study-spaces", studySpaceResponseSchema, {
        method: "POST",
        body: JSON.stringify({ schemaVersion: 1, title }),
      });
      setSpaces((previous) => [result.space, ...previous]);
      setTitle("");
      setMessage("Study space saved.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        setExpired(true);
        setError(reason.message);
      } else
        setError(
          "We could not confirm that your space was saved. Your title is still here. Reload the list before retrying to avoid creating a duplicate.",
        );
    } finally {
      setSaving(false);
    }
  }

  async function reauthenticate() {
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });
      if (result.error)
        setError(
          "Sign-in could not start. Your title is still here; please try again.",
        );
    } catch {
      setError(
        "Sign-in could not start. Your title is still here; please try again.",
      );
    }
  }

  if (activeSpace)
    return (
      <section aria-labelledby="workspace-title">
        <nav className="breadcrumbs" aria-label="Learning path">
          <button onClick={() => setActiveSpace(null)}>All spaces</button>
          <span aria-hidden="true">›</span>
          <span>{activeSpace.title}</span>
        </nav>
        <div className="workspace-header">
          <div>
            <p className="eyebrow">{initialPractice ? "Practise" : "Read"}</p>
            <h1 id="workspace-title">{activeSpace.title}</h1>
          </div>
          {initialPractice ? (
            <button
              className="secondary small"
              onClick={() => onViewChange?.("spaces")}
            >
              ← Back to reading
            </button>
          ) : (
            <button
              className="small"
              onClick={() => onViewChange?.("practice")}
            >
              Start practice ▶
            </button>
          )}
        </div>
        <MaterialWorkspace
          userId={userId}
          spaceId={activeSpace.id}
          key={activeSpace.id}
          title={activeSpace.title}
          practiceOnly={initialPractice}
          onClose={() => {
            const id = activeSpace.id;
            setActiveSpace(null);
            onViewChange?.("spaces");
            requestAnimationFrame(() =>
              document.getElementById(`open-${id}`)?.focus(),
            );
          }}
        />
      </section>
    );
  return (
    <section className="library-view" aria-labelledby="spaces-title">
      <header className="library-heading">
        <div>
          <p className="eyebrow">
            {initialPractice ? "Practice" : "Your library"}
          </p>
          <h1 id="spaces-title">
            {initialPractice
              ? "Choose a study space to practise"
              : "Your study spaces"}
          </h1>
          <p>
            {initialPractice
              ? "Choose the material whose concepts you want to practise."
              : "Everything you are learning, ready when you return."}
          </p>
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button className="secondary" onClick={() => setRetry(retry + 1)}>
            Reload study spaces
          </button>
          {expired && (
            <button className="secondary" onClick={reauthenticate}>
              Sign in again
            </button>
          )}
        </div>
      )}
      <p role="status">{loading ? "Loading study spaces…" : message}</p>
      <ul className="spaces">
        {spaces.map((space) => (
          <li className="card space-card" key={space.id}>
            <div className="space-card-mark" aria-hidden="true">
              ▤
            </div>
            <div className="space-card-copy">
              <h2>{space.title}</h2>
              <p className="fine-print">
                Created {new Date(space.createdAt).toLocaleDateString()}
              </p>
            </div>
            {space.deletionPending && (
              <p role="status">
                Deletion is pending. Retry to finish removing the material.
              </p>
            )}
            <div className="space-actions">
              <button
                id={`open-${space.id}`}
                disabled={space.deletionPending}
                onClick={() => setActiveSpace(space)}
              >
                {initialPractice ? "▶ Start practice" : "▶ Open"}
              </button>
              <SpaceCardMenu
                id={space.id}
                title={space.title}
                deletionPending={space.deletionPending}
                onPreview={() => setActiveSpace(space)}
                onDeleting={() =>
                  setSpaces((previous) =>
                    previous.map((item) =>
                      item.id === space.id
                        ? { ...item, deletionPending: true }
                        : item,
                    ),
                  )
                }
                onDeleted={() => {
                  setSpaces((previous) =>
                    previous.filter((item) => item.id !== space.id),
                  );
                  setMessage("Study space and material deleted.");
                  document.getElementById("space-title")?.focus();
                }}
              />
            </div>
          </li>
        ))}
        {!initialPractice && (
          <li className="new-space-card">
            <form onSubmit={createSpace}>
              <div className="new-space-heading">
                <span className="new-space-icon" aria-hidden="true">
                  ＋
                </span>
                <div>
                  <h2>New study space</h2>
                  <p>Start with a subject or course.</p>
                </div>
              </div>
              <label className="visually-hidden" htmlFor="space-title">
                What would you like to learn?
              </label>
              <div className="form-row">
                <input
                  id="space-title"
                  disabled={saving}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="e.g. introductory biology"
                />
                <button
                  disabled={saving || loading || !title.trim()}
                  type="submit"
                >
                  {saving ? "Saving…" : "Create"}
                </button>
              </div>
            </form>
          </li>
        )}
      </ul>
      {!loading && spaces.length === 0 && !error && (
        <p>No study spaces yet. Start with something you’re curious about.</p>
      )}
    </section>
  );
}
