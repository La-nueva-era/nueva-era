import { describe, expect, it } from "vitest";
import { cite, verseRange } from "./cite.ts";

const work = { author: "Solitario", title: "Marketing y cobardía" };
const inCycle = {
  ...work,
  collection: { title: "En defensa del arte", position: 6 },
};

describe("cite", () => {
  it("formats the spec example", () => {
    expect(cite(inCycle, [12, 15])).toBe(
      "Solitario, «Marketing y cobardía» (En defensa del arte, 6), vv. 12–15",
    );
  });

  it("uses v. for a single verse", () => {
    expect(cite(inCycle, [3, 3])).toBe(
      "Solitario, «Marketing y cobardía» (En defensa del arte, 6), v. 3",
    );
  });

  it("omits the verses for the whole work", () => {
    expect(cite(inCycle)).toBe(
      "Solitario, «Marketing y cobardía» (En defensa del arte, 6)",
    );
  });

  it("omits the parenthesis without a collection, and the number without a position", () => {
    expect(cite(work, [1, 2])).toBe(
      "Solitario, «Marketing y cobardía», vv. 1–2",
    );
    expect(cite({ ...work, collection: { title: "Álbum" } })).toBe(
      "Solitario, «Marketing y cobardía» (Álbum)",
    );
  });
});

describe("verseRange", () => {
  it("orders the bounds", () => {
    expect(verseRange(15, 12)).toBe("vv. 12–15");
    expect(verseRange(4, 4)).toBe("v. 4");
  });
});
