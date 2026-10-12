import { useEffect, useState } from "react";
import type { ResourceRecommendations } from "../../../packages/contracts/resources";
import { loadResources } from "./resource-api";
import "./supplementary-resources.css";

export function SupplementaryResources({
  spaceId,
  selectedConceptKey,
}: {
  spaceId: string;
  selectedConceptKey: string;
}) {
  const requestKey = `${spaceId}\u0000${selectedConceptKey}`;
  const [view, setView] = useState<{
    key: string;
    status: "loading" | "ready" | "error";
    result: ResourceRecommendations | null;
    error: string;
  }>({ key: requestKey, status: "loading", result: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setView({ key: requestKey, status: "loading", result: null, error: "" });
    loadResources(spaceId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted)
          setView({ key: requestKey, status: "ready", result, error: "" });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setView({
          key: requestKey,
          status: "error",
          result: null,
          error:
            reason instanceof Error
              ? reason.message
              : "Supplementary resources could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [spaceId, requestKey, retry]);
  const current = view.key === requestKey ? view : null;
  const loading = !current || current.status === "loading";
  const error = current?.status === "error" ? current.error : "";
  const result = current?.status === "ready" ? current.result : null;

  function retryResources() {
    setView({ key: requestKey, status: "loading", result: null, error: "" });
    setRetry((attempt) => attempt + 1);
  }

  return (
    <section
      className="supplementary-resources"
      aria-labelledby="resources-heading"
    >
      <h3 id="resources-heading">Supplementary resources</h3>
      <p className="notice">
        These checked external resources supplement your uploaded material. TAI
        does not send your material to these sites.
      </p>
      {loading && <p role="status">Loading checked resources…</p>}
      {error && (
        <div role="alert" className="error">
          <p>{error}</p>
          <button className="secondary" type="button" onClick={retryResources}>
            Retry resources
          </button>
        </div>
      )}
      {!loading && !error && result?.recommendations.length === 0 && (
        <p role="status">
          No suitable checked resource was found for your selected concepts.
        </p>
      )}
      {!loading && !error && result && result.recommendations.length > 0 && (
        <ul className="resource-list">
          {result.recommendations.map((resource) => (
            <li key={`${resource.supportedConcept.id}:${resource.id}`}>
              <h4>{resource.title}</h4>
              <p>
                <strong>Supports:</strong> {resource.supportedConcept.label}
              </p>
              <p>{resource.relevance}</p>
              <dl>
                <div>
                  <dt>Publisher</dt>
                  <dd>{resource.publisher}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{resource.format}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{resource.language}</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>{resource.accessConditions}</dd>
                </div>
                <div>
                  <dt>Last checked</dt>
                  <dd>{resource.checkedAt}</dd>
                </div>
              </dl>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Open supplementary resource (opens in a new tab)
              </a>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && result && result.unmatchedConcepts.length > 0 && (
        <p className="fine-print">
          No checked match for:{" "}
          {result.unmatchedConcepts.map(({ label }) => label).join(", ")}. The
          catalog is intentionally limited.
        </p>
      )}
    </section>
  );
}
