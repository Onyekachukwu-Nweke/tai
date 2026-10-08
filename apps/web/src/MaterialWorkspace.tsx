import { useEffect, useState } from "react";
import { ApiError } from "./api";
import { Reauthenticate } from "./Reauthenticate";
import { MaterialPreview } from "./MaterialPreview";
import { loadMaterial } from "./material-storage";
import type { MaterialPreview as Preview } from "./material/types";

export function MaterialWorkspace({
  spaceId,
  userId,
  title,
  onClose,
}: {
  spaceId: string;
  userId: string;
  title: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Preview | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    loadMaterial(spaceId, controller.signal)
      .then((material) => {
        if (!controller.signal.aborted) setSaved(material);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setExpired(reason instanceof ApiError && reason.status === 401);
          setError(
            reason instanceof ApiError
              ? reason.message
              : "Saved material could not be loaded. Retry before selecting a new file.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [spaceId, retry]);
  if (loading) return <p role="status">Loading saved material…</p>;
  if (error)
    return (
      <section className="card">
        <p role="alert">{error}</p>
        {expired && <Reauthenticate />}
        <button onClick={() => setRetry(retry + 1)}>
          Retry loading material
        </button>
        <button className="secondary" onClick={onClose}>
          Close preview
        </button>
      </section>
    );
  return (
    <MaterialPreview
      spaceId={spaceId}
      userId={userId}
      title={title}
      initialPreview={saved}
      onClose={onClose}
    />
  );
}
