import { useEffect, useState } from "react";
import type { PracticalTaskState } from "../../../packages/contracts/practical-tasks";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import {
  generatePracticalTask,
  loadPracticalTask,
  savePracticalCompletion,
} from "./practical-task-api";

type Source = ConceptCollection["concepts"][number]["sources"][number];
type Props = {
  spaceId: string;
  conceptIds: string[];
  sources: Source[];
  onSource: (source: Source) => void;
};
export function PracticalTask({
  spaceId,
  conceptIds,
  sources,
  onSource,
}: Props) {
  const [state, setState] = useState<PracticalTaskState>();
  const [variant, setVariant] = useState<
    "task" | "simpler" | "freeAlternative"
  >("task");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    loadPracticalTask(spaceId, controller.signal)
      .then(setState)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load practical task.",
          );
      });
    return () => controller.abort();
  }, [spaceId]);
  const generate = async () => {
    if (conceptIds.length !== 1) return;
    setGenerating(true);
    setError("");
    try {
      setState(await generatePracticalTask(spaceId, [conceptIds[0]!]));
      setVariant("task");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare a practical task.",
      );
    } finally {
      setGenerating(false);
    }
  };
  const complete = async (completed: boolean) => {
    if (!state?.task) return;
    setSaving(true);
    setSaveFailed(false);
    setError("");
    setState({ ...state, task: { ...state.task, completed } });
    try {
      setState(
        await savePracticalCompletion(spaceId, state.task.id, completed),
      );
    } catch (e) {
      setSaveFailed(true);
      setError(
        `${e instanceof Error ? e.message : "Could not save completion."} Your choice was kept on this page; retry it explicitly.`,
      );
    } finally {
      setSaving(false);
    }
  };
  const task = state?.task,
    details = task?.[variant];
  return (
    <section className="practical-task" aria-labelledby="practical-title">
      <h3 id="practical-title">Learn by doing</h3>
      <p className="fine-print">
        Completion is self-reported and is kept separate from quiz performance.
        Preparing a task sends the selected concept label and bounded cited
        excerpts to the configured AI service. Your original file, account
        details, internal IDs, and completion status are not sent.
      </p>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={conceptIds.length !== 1 || generating}
      >
        {generating
          ? "Preparing practical task…"
          : state?.status === "pending"
            ? "Retry pending task"
            : state?.status === "ready"
              ? "Prepare another task"
              : "Prepare practical task"}
      </button>
      {conceptIds.length !== 1 && (
        <p className="fine-print">
          Select exactly one concept to prepare a practical task.
        </p>
      )}
      {state?.status === "notSuitable" && (
        <p role="status">
          {state.reason ??
            "No safe desk-based task is suitable for these sources."}{" "}
          Choose another concept.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {state?.error && (
        <p role="status" className="error">
          {state.error}
        </p>
      )}
      {task && details && (
        <article>
          <div role="group" aria-label="Practical task version">
            <button
              type="button"
              className={variant === "task" ? "" : "secondary"}
              onClick={() => setVariant("task")}
            >
              Standard
            </button>
            <button
              type="button"
              className={variant === "simpler" ? "" : "secondary"}
              onClick={() => setVariant("simpler")}
            >
              Simpler task
            </button>
            <button
              type="button"
              className={variant === "freeAlternative" ? "" : "secondary"}
              onClick={() => setVariant("freeAlternative")}
            >
              No-cost alternative
            </button>
          </div>
          <h4>{details.objective}</h4>
          <dl>
            <dt>Time</dt>
            <dd>{details.estimatedMinutes} minutes</dd>
            <dt>Tools</dt>
            <dd>{details.requiredTools.join(", ")}</dd>
            <dt>Connectivity</dt>
            <dd>
              {details.connectivity.requirement}:{" "}
              {details.connectivity.disclosure}
            </dd>
            <dt>Cost</dt>
            <dd>
              {details.cost.kind === "none"
                ? "No cost."
                : details.cost.disclosure}
            </dd>
            <dt>Format</dt>
            <dd>{details.modality.replaceAll("_", " ")}</dd>
            <dt>Expected output</dt>
            <dd>{details.expectedOutput}</dd>
          </dl>
          <h5>Instructions</h5>
          <ol>
            {details.instructions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h5>Self-check</h5>
          <ul>
            {details.selfCheck.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h5>Supporting sources</h5>
          <ul>
            {task.sourceIds.map((id) => {
              const source = sources.find((item) => item.id === id);
              return source ? (
                <li key={id}>
                  <button
                    type="button"
                    className="source-link"
                    onClick={() => onSource(source)}
                  >
                    Open source section {source.location}
                  </button>
                </li>
              ) : (
                <li key={id} role="status">
                  This supporting source is unavailable. Regenerate the task
                  from the current concept.
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void complete(saveFailed ? task.completed : !task.completed)
            }
          >
            {saveFailed
              ? "Retry saving completion"
              : task.completed
                ? "Undo completion"
                : "Mark task complete"}
          </button>
          {task.completed && (
            <p role="status">
              Completed by you. This does not change quiz results.
            </p>
          )}
        </article>
      )}
    </section>
  );
}
