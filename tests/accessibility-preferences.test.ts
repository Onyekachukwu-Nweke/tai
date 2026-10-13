import { describe, expect, it } from "vitest";
import {
  loadTextSize,
  loadTextSizeFromProvider,
  TEXT_SIZE_STORAGE_KEY,
} from "../apps/web/src/accessibility-preferences";

describe("accessibility preferences", () => {
  it.each(["standard", "large", "largest"])(
    "loads the validated %s text size",
    (value) => {
      expect(loadTextSize({ getItem: () => value })).toBe(value);
    },
  );

  it("falls back safely for corrupt or unavailable storage", () => {
    expect(loadTextSize({ getItem: () => "huge" })).toBe("standard");
    expect(
      loadTextSize({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("standard");
    expect(TEXT_SIZE_STORAGE_KEY).toBe("tai:text-size");
  });

  it("survives a browser storage getter that throws", () => {
    const unavailable = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    expect(loadTextSizeFromProvider(unavailable)).toBe("standard");
  });
});
