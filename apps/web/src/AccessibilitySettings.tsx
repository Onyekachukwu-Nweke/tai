import { useState } from "react";
import {
  initializeTextSize,
  saveTextSize,
  textSizes,
  type TextSize,
} from "./accessibility-preferences";
import "./accessibility-settings.css";

const labels: Record<TextSize, string> = {
  standard: "Standard (100%)",
  large: "Large (112.5%)",
  largest: "Largest (125%)",
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
      <h2 id="settings-title">Settings</h2>
      <fieldset>
        <legend>Text size</legend>
        <div className="text-size-options">
          {textSizes.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="text-size"
                value={option}
                checked={size === option}
                onChange={() => change(option)}
              />
              {labels[option]}
            </label>
          ))}
        </div>
      </fieldset>
      <p>
        TAI currently supports an English interface and English learning
        materials only. It does not detect or translate other languages. For a
        material in another language, use a trusted translation first, check its
        terminology, symbols, numbers, and units against the original, then
        upload the English version.
      </p>
      {warning && (
        <p role="alert" className="error">
          {warning}
        </p>
      )}
    </section>
  );
}
