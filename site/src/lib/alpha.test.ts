import { describe, expect, it } from "vitest";
import { alphabetical, initial } from "./alpha.ts";

describe("alphabetical", () => {
  it("sorts in Spanish order, ignoring accents, case and opening marks", () => {
    const items = [
      "¿Por qué?",
      "Ñandú",
      "nube",
      "árbol",
      "«Zeta»",
      "Ozelot",
      "Abeja",
    ];
    expect(alphabetical(items, (x) => x)).toEqual([
      "Abeja",
      "árbol",
      "nube",
      "Ñandú",
      "Ozelot",
      "¿Por qué?",
      "«Zeta»",
    ]);
  });
});

describe("initial", () => {
  it("is the first letter, uppercase, without accents; Ñ is its own letter", () => {
    expect(initial("¿Árbol?")).toBe("A");
    expect(initial("ñandú")).toBe("Ñ");
    expect(initial("«Zeta»")).toBe("Z");
    expect(initial("20 carreras")).toBe("#");
  });
});
