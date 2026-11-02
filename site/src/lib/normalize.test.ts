import { describe, expect, it } from "vitest";
import { normalize } from "./normalize.ts";

describe("normalize", () => {
  it("strips accents and lowercases", () => {
    expect(normalize("Cobardía ÉXITO")).toBe("cobardia exito");
  });
  it("folds ñ to n", () => {
    expect(normalize("Año")).toBe("ano");
  });
  it("keeps punctuation as is", () => {
    expect(normalize("¿Qué?")).toBe("¿que?");
  });
});
