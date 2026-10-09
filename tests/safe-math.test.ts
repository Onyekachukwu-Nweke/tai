import { describe, expect, it } from "vitest";
import { safeMathHtml } from "../apps/web/src/SafeMath";

describe("safe math rendering", () => {
  it("renders bounded notation with accessible MathML", () => {
    const html = safeMathHtml(String.raw`v = \frac{d}{t}`);
    expect(html).toContain("<math");
    expect(html).toContain("katex");
  });

  it("rejects trusted commands and oversized input for literal fallback", () => {
    const unsafe = safeMathHtml(String.raw`\href{javascript:alert(1)}{x}`);
    expect(unsafe ?? "").not.toContain("javascript:");
    expect(safeMathHtml("x".repeat(501))).toBeNull();
  });
});
