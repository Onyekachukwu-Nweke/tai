export function HomeDashboard({
  name,
  onSpaces,
  onPractice,
}: {
  name: string;
  onSpaces: () => void;
  onPractice: () => void;
}) {
  const firstName = name.trim().split(/\s+/)[0] || "Learner";
  return (
    <section className="home-dashboard" aria-labelledby="home-title">
      <div className="home-heading">
        <p className="eyebrow">Your learning companion</p>
        <h1 id="home-title">Good to see you, {firstName}.</h1>
        <p>Continue with your material, or take a focused practice step.</p>
      </div>
      <div className="next-step-grid">
        <article className="next-step primary-step">
          <div className="step-icon" aria-hidden="true">
            <Icon className="icon" name="book-open" size={20} />
          </div>
          <div className="next-step-copy">
            <p className="step-kicker">Your library</p>
            <h2>Study spaces</h2>
            <p>Read your material and choose the concepts to work on.</p>
          </div>
          <button onClick={onSpaces}>Open study spaces</button>
        </article>
        <article className="next-step supporting-step">
          <div className="step-icon practice-icon" aria-hidden="true">
            <Icon className="icon" name="play" size={20} />
          </div>
          <div className="next-step-copy">
            <p className="step-kicker">Active recall</p>
            <h2>Practice</h2>
            <p>Resume saved questions or start with selected concepts.</p>
          </div>
          <button className="secondary" onClick={onPractice}>
            Go to practice
          </button>
        </article>
      </div>
      <section className="learning-loop" aria-labelledby="loop-title">
        <div>
          <p className="eyebrow">A simple learning loop</p>
          <h2 id="loop-title">Read. Make sense of it. Recall it.</h2>
        </div>
        <ol>
          <li>
            <span>1</span>
            <strong>Bring a source</strong>
            <small>PDF or text</small>
          </li>
          <li>
            <span>2</span>
            <strong>Choose concepts</strong>
            <small>With page citations</small>
          </li>
          <li>
            <span>3</span>
            <strong>Practise recall</strong>
            <small>At your pace</small>
          </li>
        </ol>
      </section>
      <p className="home-trust">
        <Icon className="icon" name="lock" size={15} /> Your original file stays
        private; only bounded excerpts needed for learning activities are sent
        to the configured AI service.
      </p>
    </section>
  );
}
import { Icon } from "./Icon";
