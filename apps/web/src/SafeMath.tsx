import katex from "katex";
import "katex/dist/katex.min.css";

const MAX_NOTATION_LENGTH = 500;

export function safeMathHtml(value: string) {
  if (value.length > MAX_NOTATION_LENGTH) return null;
  if (
    /\\(?:href|url|includegraphics|html(?:Class|Id|Style|Data))\b/.test(value)
  )
    return null;
  try {
    return katex.renderToString(value, {
      output: "htmlAndMathml",
      throwOnError: true,
      strict: "error",
      trust: false,
      maxExpand: 100,
      maxSize: 20,
    });
  } catch {
    return null;
  }
}

export function SafeMath({ value }: { value: string }) {
  const html = safeMathHtml(value);
  if (html)
    return (
      <span
        className="math-notation"
        aria-label={`Equation: ${value}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  return <code aria-label={`Equation: ${value}`}>{value}</code>;
}
