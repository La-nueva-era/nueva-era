import { describe, expect, it } from "vitest";
import {
  buildSearchData,
  highlight,
  loadIndex,
  searchVerses,
  suggest,
  type SearchWork,
} from "./search.ts";

const works: SearchWork[] = [
  {
    id: "solitario/a",
    title: "Contra el arte subjetivo",
    author: "Solitario",
    authorId: "solitario",
    url: "/solitario/a",
    collections: ["ciclo"],
    tags: [],
    marks: [{ title: "Ciclo", position: 2 }],
    verses: [
      "El arte es una expresión sentimental",
      "son emociones procesadas",
      "el año pasado",
    ],
  },
  {
    id: "ozelot/b",
    title: "Otra obra",
    author: "Ozelot",
    authorId: "ozelot",
    url: "/ozelot/b",
    collections: [],
    tags: ["serie"],
    marks: [],
    verses: ["un ano cualquiera", "Expresiones de arte"],
  },
];
const data = buildSearchData(works);
const index = loadIndex(JSON.stringify(data));
const ids = (r: { work: string; n: number }[]) =>
  r.map((x) => `${x.work}#${x.n}`);

describe("searchVerses", () => {
  it("is accent- and case-insensitive", () => {
    expect(ids(searchVerses(index, "EXPRESION"))).toContain("solitario/a#1");
    expect(ids(searchVerses(index, "emociónes"))).toEqual(["solitario/a#2"]);
  });

  it("matches ñ and n both ways", () => {
    expect(ids(searchVerses(index, "año")).sort()).toEqual([
      "ozelot/b#1",
      "solitario/a#3",
    ]);
    expect(ids(searchVerses(index, "ano")).sort()).toEqual([
      "ozelot/b#1",
      "solitario/a#3",
    ]);
  });

  it("uses prefix and fuzzy matching only for words of 4+ characters", () => {
    expect(ids(searchVerses(index, "expres")).sort()).toEqual([
      "ozelot/b#2",
      "solitario/a#1",
    ]);
    expect(ids(searchVerses(index, "sentimentak"))).toEqual(["solitario/a#1"]);
    expect(searchVerses(index, "ar")).toEqual([]);
  });

  it("requires every word of the query", () => {
    expect(ids(searchVerses(index, "arte expresión")).sort()).toEqual([
      "ozelot/b#2",
      "solitario/a#1",
    ]);
    expect(ids(searchVerses(index, "arte emociones"))).toEqual([]);
  });

  it("filters by author, collection and tag", () => {
    expect(ids(searchVerses(index, "arte", { author: "ozelot" }))).toEqual([
      "ozelot/b#2",
    ]);
    expect(ids(searchVerses(index, "arte", { collection: "ciclo" }))).toEqual([
      "solitario/a#1",
    ]);
    expect(ids(searchVerses(index, "arte", { tag: "serie" }))).toEqual([
      "ozelot/b#2",
    ]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchVerses(index, "  ")).toEqual([]);
  });
});

describe("suggest", () => {
  it("matches titles and first verses by prefix, without accents", () => {
    expect(suggest(index, "subj").map((s) => s.work)).toEqual(["solitario/a"]);
    expect(suggest(index, "un an").map((s) => s.work)).toEqual(["ozelot/b"]);
  });

  it("returns at most the requested number", () => {
    expect(suggest(index, "o", 1)).toHaveLength(1);
  });
});

describe("highlight", () => {
  it("marks words that match the query, keeping the original text", () => {
    expect(highlight("El arte es una Expresión", "expresion arte")).toEqual([
      { text: "El ", hit: false },
      { text: "arte", hit: true },
      { text: " es una ", hit: false },
      { text: "Expresión", hit: true },
    ]);
  });

  it("marks prefix matches for words of 4+ characters", () => {
    expect(highlight("Expresiones", "expres")).toEqual([
      { text: "Expresiones", hit: true },
    ]);
    expect(highlight("arte", "ar")).toEqual([{ text: "arte", hit: false }]);
  });
});
