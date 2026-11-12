import { describe, expect, it } from "vitest";
import { derive, type DeriveWork } from "./derive.ts";

const w = (id: string, over: Partial<DeriveWork> = {}): DeriveWork => ({
  id,
  author: id.split("/")[0] ?? "",
  title: id,
  public: true,
  published: "2021-01-01",
  collections: [],
  tags: [],
  related: [],
  text: "",
  ...over,
});

const authors = [
  { id: "solitario", name: "Solitario" },
  { id: "ozelot", name: "Ozelot" },
];

describe("derive — neighbours", () => {
  it("gives previous and next by position in an ordered collection", () => {
    const works = [
      w("solitario/a", { collections: [{ id: "c", position: 1 }] }),
      w("solitario/b", { collections: [{ id: "c", position: 2 }] }),
      w("solitario/c", { collections: [{ id: "c", position: 3 }] }),
    ];
    const d = derive(works, authors).get("solitario/b");
    expect(d?.neighbours).toEqual([
      {
        kind: "collections",
        id: "c",
        prev: { id: "solitario/a", position: 1 },
        next: { id: "solitario/c", position: 3 },
      },
    ]);
  });

  it("works for tags too, and leaves out hidden works", () => {
    const works = [
      w("solitario/a", { tags: [{ id: "t", position: 1 }] }),
      w("solitario/b", { tags: [{ id: "t", position: 2 }], public: false }),
      w("solitario/c", { tags: [{ id: "t", position: 3 }] }),
    ];
    const d = derive(works, authors).get("solitario/c");
    expect(d?.neighbours).toEqual([
      { kind: "tags", id: "t", prev: { id: "solitario/a", position: 1 } },
    ]);
  });

  it("orders members without position by publication date", () => {
    const works = [
      w("solitario/b", { collections: [{ id: "c" }], published: "2022-01-01" }),
      w("solitario/a", { collections: [{ id: "c" }], published: "2021-01-01" }),
    ];
    expect(
      derive(works, authors).get("solitario/b")?.neighbours[0]?.prev,
    ).toEqual({ id: "solitario/a" });
  });
});

describe("derive — related", () => {
  it("collects reverse related links from public works", () => {
    const works = [
      w("solitario/a", { related: ["solitario/c"] }),
      w("solitario/b", { related: ["solitario/c"], public: false }),
      w("solitario/c"),
    ];
    expect(derive(works, authors).get("solitario/c")?.relatedFrom).toEqual([
      "solitario/a",
    ]);
  });
});

describe("derive — intertextual mentions", () => {
  it("finds works whose text contains this work's title, ignoring accents and case", () => {
    const works = [
      w("solitario/contra", { title: "Contra el arte subjetivo" }),
      w("solitario/os", {
        text: "refuta «Contra el ARTE subjetivo» y no seas plasta",
      }),
      w("solitario/otro", { text: "contra el arte objetivo" }),
    ];
    expect(derive(works, authors).get("solitario/contra")?.mentionedIn).toEqual(
      ["solitario/os"],
    );
  });

  it("matches whole words only and never the work itself", () => {
    const works = [
      w("solitario/pacto", { title: "Pacto", text: "un pacto" }),
      w("solitario/x", { text: "impactos" }),
    ];
    expect(derive(works, authors).get("solitario/pacto")?.mentionedIn).toEqual(
      [],
    );
  });

  it("finds the other poet's name in a work's text", () => {
    const works = [
      w("solitario/a", { text: "como decía Ozelot" }),
      w("ozelot/b", { text: "nada" }),
    ];
    const d = derive(works, authors);
    expect(d.get("solitario/a")?.mentionsAuthors).toEqual(["ozelot"]);
    expect(d.get("ozelot/b")?.mentionsAuthors).toEqual([]);
  });
});
