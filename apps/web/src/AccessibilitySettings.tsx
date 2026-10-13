import { useState } from "react";
import {
  initializeTextSize,
  saveTextSize,
  textSizes,
  type TextSize,
} from "./accessibility-preferences";
import "./accessibility-settings.css";
const labels: Record<TextSize, string> = {
  standard: "A",
  large: "A+",
  largest: "A++",
};
export function AccessibilitySettings() {
  const [size, setSize] = useState(initializeTextSize);
  const [warning, setWarning] = useState("");
  function change(next: TextSize) {
    setSize(next);
    setWarning(saveTextSize(next));
  }
  return (
    <section
      className="card accessibility-settings"
      aria-labelledby="settings-title"
    >
      <h1 id="settings-title">Settings</h1>
      <div className="settings-row">
        <strong>Text size</strong>
        <fieldset>
          <legend className="sr-only">Text size</legend>
          <div className="segmented text-size-options">
            {textSizes.map((option, index) => (
              <label
                key={option}
                style={{ fontSize: `${1 + index * 0.12}rem` }}
              >
                <input
                  type="radio"
                  name="text-size"
                  value={option}
                  checked={size === option}
                  onChange={() => change(option)}
                />
                {labels[option]}
                <span className="sr-only"> {option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="settings-row">
        <strong>Language</strong>
        <p>
          🌐 TAI currently supports English interface and learning materials.
        </p>
      </div>
      {warning && (
        <p role="alert" className="error">
          {warning}
        </p>
      )}
    </section>
  );
}
