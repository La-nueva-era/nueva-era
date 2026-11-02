import { describe, expect, it } from "vitest";
import { lintContent, type Issue } from "./content-lint.ts";

const AUTHORS = {
  "authors/solitario.yaml": "id: solitario\nname: Solitario\n",
  "authors/ozelot.yaml": "id: ozelot\nname: Ozelot\n",
};

type Front = Record<string, string>;

/** Builds a work file. `front` lines replace the defaults by key. */
function work(body: string, front: Front = {}): string {
  const fields: Front = {
    title: "title: Título de prueba",
    author: "author: solitario",
    youtube: "youtube:\n  id: AAAAAAAAAAA\n  published: 2021-09-14",
    status: "status: draft",
    visibility: "visibility: public",
    ...front,
  };
  const yaml = Object.values(fields)
    .filter((v) => v !== "")
    .join("\n");
  return `---\n${yaml}\n---\n${body}`;
}

function lint(files: Record<string, string>): Issue[] {
  return lintContent({ ...AUTHORS, ...files });
}

const rules = (issues: Issue[]) => issues.map((i) => `${i.severity}:${i.rule}`);

describe("lintContent — clean content", () => {
  it("reports nothing for a valid draft", () => {
    expect(lint({ "solitario/uno.md": work("uno, dos\ntres.\n") })).toEqual([]);
  });

  it("ignores files whose name starts with _", () => {
    expect(lint({ "solitario/_ejemplo.md": "anything goes..." })).toEqual([]);
  });
});

describe("lintContent — front matter and schema", () => {
  it("fails when the front matter is missing", () => {
    expect(rules(lint({ "solitario/uno.md": "uno\n" }))).toEqual([
      "error:front-matter",
    ]);
  });

  it("fails on schema violations with the field path", () => {
    const issues = lint({
      "solitario/uno.md": work("uno\n", { status: "status: listo" }),
    });
    expect(rules(issues)).toEqual(["error:schema"]);
    expect(issues[0]?.message).toContain("status");
  });

  it("fails on impossible dates that a lenient parser would roll over", () => {
    const youtube = "youtube:\n  id: AAAAAAAAAAA\n  published: 2021-02-30";
    expect(
      rules(lint({ "solitario/uno.md": work("uno\n", { youtube }) })),
    ).toEqual(["error:schema"]);
  });

  it("fails on an invalid author or collection file", () => {
    expect(
      rules(lint({ "authors/solitario.yaml": "id: solitario\n" })),
    ).toEqual(["error:schema"]);
  });

  it("fails when a YAML id does not match its filename", () => {
    expect(
      rules(lint({ "authors/ozelot.yaml": "id: otro\nname: Ozelot\n" })),
    ).toEqual(["error:id-filename"]);
  });

  it("fails when the work author does not match its directory", () => {
    const issues = lint({ "ozelot/uno.md": work("uno\n") });
    expect(rules(issues)).toEqual(["error:author-directory"]);
  });

  it("fails on a slug that is not kebab-case ASCII", () => {
    expect(
      rules(lint({ "solitario/Una parte de mí.md": work("uno\n") })),
    ).toEqual(["error:slug"]);
  });

  it("fails on a patreon source with text, with a specific message", () => {
    const sources =
      "sources:\n  - kind: patreon\n    title: Post\n    url: https://www.patreon.com/posts/1\n    date: 2021-09-21\n    text: secreto";
    const issues = lint({ "solitario/uno.md": work("uno\n", { sources }) });
    expect(rules(issues)).toEqual(["error:patreon-text"]);
  });
});

describe("lintContent — body parse", () => {
  it("reports parser errors at the file line", () => {
    const issues = lint({ "solitario/uno.md": work("uno\n@t=5\n") });
    expect(rules(issues)).toEqual(["error:parse"]);
    expect(issues[0]?.line).toBe(11);
  });
});

describe("lintContent — typography", () => {
  const cases: [string, string, string][] = [
    ["straight double quote", 'dijo "no"\n', "straight-quote"],
    ["straight apostrophe", "pa' mí\n", "straight-quote"],
    ["three dots", "y luego...\n", "ellipsis"],
    ["spaced hyphen as dash", "uno - dos\n", "hyphen-dash"],
    ["double hyphen as dash", "uno--dos\n", "hyphen-dash"],
    ["double space", "uno  dos\n", "double-space"],
    ["trailing whitespace", "uno \n", "trailing-whitespace"],
    ["tab", "uno\tdos\n", "tab"],
    ["missing final newline", "uno", "final-newline"],
    ["unclosed ¿", "¿uno\n", "unbalanced"],
    ["unopened ?", "uno?\n", "unbalanced"],
    ["unclosed ¡", "¡uno\n", "unbalanced"],
    ["unclosed «", "«uno\n", "unbalanced"],
    ["unopened »", "uno»\n", "unbalanced"],
  ];
  for (const [name, body, rule] of cases) {
    it(`fails on ${name} in the body`, () => {
      expect(rules(lint({ "solitario/uno.md": work(body) }))).toEqual([
        `error:${rule}`,
      ]);
    });
  }

  it("accepts real typography", () => {
    const body = "¿Acaso «esto» —dijo— es pa’ mí…?\n¡Sí!, bien-hecho\n";
    expect(lint({ "solitario/uno.md": work(body) })).toEqual([]);
  });

  it("balances ¿? across verses of an enjambed question", () => {
    expect(
      lint({ "solitario/uno.md": work("¿Cómo puedo creer\nen esto?\n") }),
    ).toEqual([]);
  });

  it("reports the file line of a typography error", () => {
    const issues = lint({ "solitario/uno.md": work("uno\n\ndos...\n") });
    expect(issues[0]?.line).toBe(12);
  });

  it("checks the title", () => {
    const issues = lint({
      "solitario/uno.md": work("uno\n", { title: "title: Uno...  dos" }),
    });
    expect(rules(issues).sort()).toEqual([
      "error:double-space",
      "error:ellipsis",
    ]);
  });

  it("checks notes", () => {
    const notes = 'notes:\n  - text: el audio dice "otra"';
    expect(
      rules(lint({ "solitario/uno.md": work("uno\n", { notes }) })),
    ).toEqual(["error:straight-quote"]);
  });

  it("does not check verbatim source text", () => {
    const sources =
      'sources:\n  - kind: youtube-description\n    date: 2021-09-14\n    text: "Hola... \\"tal\\""';
    expect(lint({ "solitario/uno.md": work("uno\n", { sources }) })).toEqual(
      [],
    );
  });
});

describe("lintContent — title case", () => {
  it("fails on a capital inside the title", () => {
    const issues = lint({
      "solitario/uno.md": work("uno\n", { title: "title: Contra el Arte" }),
    });
    expect(rules(issues)).toEqual(["error:title-case"]);
  });

  it("fails on a lower-case first letter", () => {
    expect(
      rules(
        lint({ "solitario/uno.md": work("uno\n", { title: "title: contra" }) }),
      ),
    ).toEqual(["error:title-case"]);
  });

  it("can be overridden with title_case_ok", () => {
    const front = {
      title: "title: Leyendo a Platón",
      ok: "title_case_ok: true",
    };
    expect(lint({ "solitario/uno.md": work("uno\n", front) })).toEqual([]);
  });

  it("accepts an opening ¿ or « before the first capital", () => {
    expect(
      lint({
        "solitario/uno.md": work("uno\n", { title: "title: ¿Por qué no?" }),
      }),
    ).toEqual([]);
  });
});

describe("lintContent — review status", () => {
  const reviewed = {
    status: "status: reviewed",
    edition:
      "edition:\n  copy_text: written\n  checked: [written, audio]\n  reviewed_on: 2026-09-01",
  };

  it("accepts a fully reviewed work", () => {
    expect(lint({ "solitario/uno.md": work("uno\n", reviewed) })).toEqual([]);
  });

  it("fails on reviewed without edition.reviewed_on", () => {
    const edition =
      "edition:\n  copy_text: written\n  checked: [written, audio]";
    expect(
      rules(
        lint({ "solitario/uno.md": work("uno\n", { ...reviewed, edition }) }),
      ),
    ).toEqual(["error:reviewed-on"]);
  });

  it("fails on reviewed without edition", () => {
    expect(
      rules(
        lint({
          "solitario/uno.md": work("uno\n", { ...reviewed, edition: "" }),
        }),
      ),
    ).toEqual(["error:reviewed-on"]);
  });

  it("fails on reviewed when the copy-text or audio was not checked", () => {
    const edition =
      "edition:\n  copy_text: written\n  checked: [written]\n  reviewed_on: 2026-09-01";
    expect(
      rules(
        lint({ "solitario/uno.md": work("uno\n", { ...reviewed, edition }) }),
      ),
    ).toEqual(["error:reviewed-checked"]);
  });

  it("warns on an uncertain reading in a reviewed work", () => {
    expect(
      rules(lint({ "solitario/uno.md": work("lee {?razón}\n", reviewed) })),
    ).toEqual(["warning:uncertain"]);
  });

  it("does not warn on an uncertain reading in a draft", () => {
    expect(lint({ "solitario/uno.md": work("lee {?razón}\n") })).toEqual([]);
  });
});

describe("lintContent — cross-references", () => {
  const collection =
    "id: ciclo\nauthor: solitario\ntitle: Ciclo\nkind: cycle\nordered: true\n";
  const inCycle = (n: number) => ({
    collections: `collections:\n  - id: ciclo\n    position: ${n}`,
  });
  const yt = (id: string) => ({
    youtube: `youtube:\n  id: ${id}\n  published: 2021-09-14`,
  });

  it("fails on duplicate youtube ids", () => {
    const issues = lint({
      "solitario/uno.md": work("uno\n"),
      "solitario/dos.md": work("dos\n"),
    });
    expect(rules(issues)).toEqual(["error:duplicate-youtube-id"]);
  });

  it("fails on unknown collection, tag and related targets", () => {
    const front = {
      collections: "collections:\n  - id: nada",
      tags: "tags:\n  - id: nada",
      related: "related:\n  - solitario/nada",
    };
    expect(rules(lint({ "solitario/uno.md": work("uno\n", front) }))).toEqual([
      "error:unknown-collection",
      "error:unknown-tag",
      "error:unknown-related",
    ]);
  });

  it("accepts contiguous positions in an ordered collection, starting anywhere", () => {
    const issues = lint({
      "collections/ciclo.yaml": collection,
      "solitario/uno.md": work("uno\n", {
        ...inCycle(0),
        ...yt("AAAAAAAAAAA"),
      }),
      "solitario/dos.md": work("dos\n", {
        ...inCycle(1),
        ...yt("BBBBBBBBBBB"),
      }),
    });
    expect(issues).toEqual([]);
  });

  it("fails on gaps, duplicates and missing positions in an ordered collection", () => {
    const gap = lint({
      "collections/ciclo.yaml": collection,
      "solitario/uno.md": work("uno\n", {
        ...inCycle(1),
        ...yt("AAAAAAAAAAA"),
      }),
      "solitario/dos.md": work("dos\n", {
        ...inCycle(3),
        ...yt("BBBBBBBBBBB"),
      }),
    });
    expect(rules(gap)).toEqual(["error:collection-positions"]);

    const dup = lint({
      "collections/ciclo.yaml": collection,
      "solitario/uno.md": work("uno\n", {
        ...inCycle(1),
        ...yt("AAAAAAAAAAA"),
      }),
      "solitario/dos.md": work("dos\n", {
        ...inCycle(1),
        ...yt("BBBBBBBBBBB"),
      }),
    });
    expect(rules(dup)).toEqual(["error:collection-positions"]);

    const missing = lint({
      "collections/ciclo.yaml": collection,
      "solitario/uno.md": work("uno\n", {
        collections: "collections:\n  - id: ciclo",
      }),
    });
    expect(rules(missing)).toEqual(["error:collection-positions"]);
  });

  it("fails on gaps in an ordered tag, like an ordered collection", () => {
    const tag = "id: serie\ntitle: SERIE\nauthor: solitario\nordered: true\n";
    const inTag = (n: number) => ({
      tags: `tags:\n  - id: serie\n    position: ${n}`,
    });
    const ok = lint({
      "tags/serie.yaml": tag,
      "solitario/uno.md": work("uno\n", { ...inTag(1), ...yt("AAAAAAAAAAA") }),
      "solitario/dos.md": work("dos\n", { ...inTag(2), ...yt("BBBBBBBBBBB") }),
    });
    expect(ok).toEqual([]);
    const gap = lint({
      "tags/serie.yaml": tag,
      "solitario/uno.md": work("uno\n", { ...inTag(1), ...yt("AAAAAAAAAAA") }),
      "solitario/dos.md": work("dos\n", { ...inTag(4), ...yt("BBBBBBBBBBB") }),
    });
    expect(rules(gap)).toEqual(["error:tag-positions"]);
  });

  it("does not check positions in an unordered tag", () => {
    const tag = "id: arte\ntitle: Arte\nauthor: solitario\nordered: false\n";
    const issues = lint({
      "tags/arte.yaml": tag,
      "solitario/uno.md": work("uno\n", { tags: "tags:\n  - id: arte" }),
    });
    expect(issues).toEqual([]);
  });

  it("fails on a note anchored past the last verse", () => {
    const notes = "notes:\n  - verse: 3\n    text: nota.";
    expect(
      rules(lint({ "solitario/uno.md": work("uno\ndos\n", { notes }) })),
    ).toEqual(["error:note-verse"]);
  });
});
