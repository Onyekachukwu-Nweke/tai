import { useEffect, useState, type FormEvent } from "react";
import {
  studySpaceListSchema,
  studySpaceResponseSchema,
} from "../../../packages/contracts/study-spaces";
import { api, ApiError, authClient } from "./api";
import { MaterialPreview } from "./MaterialPreview";

type Space = { id: string; title: string; createdAt: string };

export function StudySpaces() {
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

  return (
    <section aria-labelledby="spaces-title">
      <h2 id="spaces-title">Your study spaces</h2>
      <form className="card" onSubmit={createSpace}>
        <label htmlFor="space-title">What would you like to learn?</label>
        <p id="title-help" className="fine-print">
          Give your space a name, then preview a PDF or TXT file locally.
        </p>
        <div className="form-row">
          <input
            id="space-title"
            disabled={saving}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            aria-describedby="title-help"
            placeholder="For example, introductory biology"
          />
          <button disabled={saving || loading || !title.trim()} type="submit">
            {saving ? "Saving…" : "Create study space"}
          </button>
        </div>
      </form>
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
      {!loading && spaces.length === 0 && !error && (
        <p>No study spaces yet. Start with something you’re curious about.</p>
      )}
      <ul className="spaces">
        {spaces.map((space) => (
          <li className="card" key={space.id}>
            <h3>{space.title}</h3>
            <p className="fine-print">
              Preview your material locally. Uploads are not available yet.
            </p>
            <button
              type="button"
              className="secondary"
              id={`preview-${space.id}`}
              onClick={() => setActiveSpace(space)}
            >
              Preview material
            </button>
          </li>
        ))}
      </ul>
      {activeSpace && (
        <MaterialPreview
          key={activeSpace.id}
          title={activeSpace.title}
          onClose={() => {
            const id = activeSpace.id;
            setActiveSpace(null);
            document.getElementById(`preview-${id}`)?.focus();
          }}
        />
      )}
    </section>
  );
}
