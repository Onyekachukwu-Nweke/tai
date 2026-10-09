import type { StudySession } from "../../../packages/contracts/study-sessions";

export function SessionSummary({ session }: { session: StudySession }) {
  return (
    <section className="card" aria-labelledby="session-summary-heading">
      <h4 id="session-summary-heading">Session saved</h4>
      <p>
        {session.items.length
          ? `You completed ${session.items.length} ${session.items.length === 1 ? "activity" : "activities"}. Your saved progress is available on another signed-in device.`
          : "There were no eligible activities in the current pack. Prepare another pack or change your concept selection."}
      </p>
      <p>No streak or time limit applies. Choose another session when ready.</p>
    </section>
  );
}
