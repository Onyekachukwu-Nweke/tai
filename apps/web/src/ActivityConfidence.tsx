import type { ActivityDraft } from "./activity-drafts";

export function ActivityConfidence({
  value,
  disabled,
  onChange,
}: {
  value: ActivityDraft["confidence"];
  disabled: boolean;
  onChange: (value: ActivityDraft["confidence"]) => void;
}) {
  return (
    <label>
      Confidence (optional)
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as ActivityDraft["confidence"])
        }
      >
        <option value="">Not set</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </label>
  );
}
