import { describe, expect, it } from "vitest";
import { fold, matches } from "./find.ts";

describe("fold", () => {
  it("ignores case and accents", () => {
    expect(fold("Corazón")).toBe("corazon");
    expect(fold("ÚLTIMO pingüino")).toBe("ultimo pinguino");
  });

  it("keeps the ñ apart from the n", () => {
    expect(fold("Año")).toBe("año");
  });

  it("keeps the length of the text", () => {
    const text = "«¿Qué—dirán…?» 𝄞 ǆ";
    expect(fold(text)).toHaveLength(text.length);
  });
});

describe("matches", () => {
  it("finds every occurrence, whatever its accents or case", () => {
    expect(matches("El corazón, mi Corazon", "corazón")).toEqual([3, 15]);
  });

  it("does not take an n for an ñ", () => {
    expect(matches("un año, un ano", "año")).toEqual([3]);
  });

  it("does not overlap matches", () => {
    expect(matches("aaaa", "aa")).toEqual([0, 2]);
  });

  it("finds nothing for an empty query", () => {
    expect(matches("verso", "")).toEqual([]);
  });
});
