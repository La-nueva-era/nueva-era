import { describe, expect, it } from "vitest";
import { parseFragments, resolveFragments } from "./fragments.ts";

const works = new Map([
  [
    "solitario/a",
    {
      title: "A",
      url: "/solitario/a",
      public: true,
      verses: ["uno", "dos {?tres}", "cuatro"],
    },
  ],
  [
    "solitario/h",
    { title: "H", url: "/solitario/h", public: false, verses: ["oculto"] },
  ],
]);

describe("parseFragments", () => {
  it("reads a list of work references with a verse or a verse range", () => {
    const yaml =
      "- work: solitario/a\n  verses: [1, 2]\n- work: solitario/a\n  verses: 3\n";
    expect(parseFragments(yaml)).toEqual([
      { work: "solitario/a", from: 1, to: 2 },
      { work: "solitario/a", from: 3, to: 3 },
    ]);
  });

  it("reads an optional highlighted verse or range inside the fragment", () => {
    const yaml =
      "- work: solitario/a\n  verses: [1, 3]\n  highlight: 2\n- work: solitario/a\n  verses: [1, 3]\n  highlight: [2, 3]\n";
    expect(parseFragments(yaml)).toEqual([
      { work: "solitario/a", from: 1, to: 3, highlight: { from: 2, to: 2 } },
      { work: "solitario/a", from: 1, to: 3, highlight: { from: 2, to: 3 } },
    ]);
    expect(
      parseFragments("- work: solitario/a\n  verses: 1\n")[0],
    ).not.toHaveProperty("highlight");
  });

  it("rejects a highlight outside the fragment or going down", () => {
    expect(() =>
      parseFragments("- work: solitario/a\n  verses: [2, 3]\n  highlight: 1\n"),
    ).toThrow(/highlight/);
    expect(() =>
      parseFragments(
        "- work: solitario/a\n  verses: [1, 3]\n  highlight: [3, 4]\n",
      ),
    ).toThrow(/highlight/);
    expect(() =>
      parseFragments(
        "- work: solitario/a\n  verses: [1, 3]\n  highlight: [3, 2]\n",
      ),
    ).toThrow(/highlight/);
  });

  it("reads an optional cut mark: start, end or both", () => {
    const yaml =
      "- work: solitario/a\n  verses: [1, 2]\n  cut: end\n- work: solitario/a\n  verses: 3\n  cut: both\n";
    expect(parseFragments(yaml).map((f) => f.cut)).toEqual(["end", "both"]);
    expect(
      parseFragments("- work: solitario/a\n  verses: 1\n")[0],
    ).not.toHaveProperty("cut");
    expect(() =>
      parseFragments("- work: solitario/a\n  verses: 1\n  cut: middle\n"),
    ).toThrow(/cut/);
  });

  it("rejects malformed entries", () => {
    expect(() => parseFragments("- work: a\n  verses: 1\n")).toThrow(/work/);
    expect(() =>
      parseFragments("- work: solitario/a\n  verses: [2, 1]\n"),
    ).toThrow(/verses/);
    expect(() =>
      parseFragments("- work: solitario/a\n  verses: 1\n  text: x\n"),
    ).toThrow();
  });
});

describe("resolveFragments", () => {
  it("takes the verse text from the work, without uncertain-reading markup", () => {
    expect(
      resolveFragments([{ work: "solitario/a", from: 2, to: 3 }], works),
    ).toEqual([
      { title: "A", href: "/solitario/a#v2-3", verses: ["dos tres", "cuatro"] },
    ]);
    expect(
      resolveFragments([{ work: "solitario/a", from: 1, to: 1 }], works)[0]
        ?.href,
    ).toBe("/solitario/a#v1");
  });

  it("marks highlighted verses by their position in the fragment", () => {
    const [f] = resolveFragments(
      [{ work: "solitario/a", from: 1, to: 3, highlight: { from: 2, to: 3 } }],
      works,
    );
    expect(f?.highlight).toEqual([1, 2]);
    expect(
      resolveFragments([{ work: "solitario/a", from: 1, to: 3 }], works)[0],
    ).not.toHaveProperty("highlight");
  });

  it("passes the cut mark through", () => {
    const [f] = resolveFragments(
      [{ work: "solitario/a", from: 1, to: 2, cut: "start" }],
      works,
    );
    expect(f?.cut).toBe("start");
  });

  it("fails on an unknown or hidden work and on verses past the end", () => {
    expect(() =>
      resolveFragments([{ work: "solitario/x", from: 1, to: 1 }], works),
    ).toThrow(/solitario\/x/);
    expect(() =>
      resolveFragments([{ work: "solitario/h", from: 1, to: 1 }], works),
    ).toThrow(/hidden/);
    expect(() =>
      resolveFragments([{ work: "solitario/a", from: 3, to: 4 }], works),
    ).toThrow(/3 verses/);
  });
});
