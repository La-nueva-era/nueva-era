import { describe, expect, it } from "vitest";
import { abridge, fillFraming, renderWork, type PackWork } from "./pack.ts";

const work: PackWork = {
  id: "solitario/nueva-era",
  author: "Solitario",
  title: "Nueva era",
  url: "https://lanuevaera.org/solitario/nueva-era",
  youtubeId: "AAAAAAAAAAA",
  published: "2022-04-06",
  collections: [],
  tags: [],
  status: "reviewed",
  reviewedOn: "2026-09-01",
  verseCount: 4,
  stanzas: [
    {
      lines: [
        { kind: "verse", n: 1, text: "Primer verso…" },
        { kind: "verse", n: 2, text: "Segundo verso…" },
      ],
    },
    {
      lines: [
        { kind: "verse", n: 3, text: "Nueva estrofa…" },
        { kind: "label", name: "Els1" },
        { kind: "verse", n: 4, text: "…" },
      ],
    },
  ],
  notes: [{ verse: 41, text: "Nota anclada." }, { text: "Nota general.\n" }],
  sources: [
    {
      kind: "youtube-description",
      date: "2022-04-06",
      text: "Línea uno\nLínea dos\n",
    },
    {
      kind: "community-post",
      title: "Post",
      url: "https://www.youtube.com/post/1",
      date: "2022-04-10",
    },
    {
      kind: "patreon",
      title: "P",
      url: "https://www.patreon.com/posts/1",
      date: "2022-04-12",
    },
    { kind: "external", title: "E", url: "https://example.org/x" },
  ],
};

describe("renderWork", () => {
  it("renders the SPEC §9.3 shape", () => {
    expect(renderWork(work)).toBe(
      [
        "## Solitario — Nueva era",
        "id: solitario/nueva-era",
        "url: https://lanuevaera.org/solitario/nueva-era",
        "video: https://www.youtube.com/watch?v=AAAAAAAAAAA",
        "published: 2022-04-06",
        "collections: —",
        "tags: —",
        "status: reviewed (2026-09-01)",
        "verses: 4",
        "",
        "  1  Primer verso…",
        "  2  Segundo verso…",
        "",
        "  3  Nueva estrofa…",
        " [Els1]",
        "  4  …",
        "",
        "### Notes",
        "- v. 41: Nota anclada.",
        "- Nota general.",
        "",
        "### Sources",
        "- YouTube description (2022-04-06):",
        "  > Línea uno",
        "  > Línea dos",
        "- Community post (2022-04-10): https://www.youtube.com/post/1",
        "- Patreon (2022-04-12, subscribers): https://www.patreon.com/posts/1",
        "- External link: https://example.org/x",
        "",
      ].join("\n"),
    );
  });

  it("lists series with positions, shows drafts, and omits empty sections", () => {
    const out = renderWork({
      ...work,
      status: "draft",
      reviewedOn: undefined,
      collections: [{ title: "En defensa del arte", position: 6 }],
      tags: [{ title: "LIMBICO", position: 2 }, { title: "Arte" }],
      notes: [],
      sources: [],
    });
    expect(out).toContain("collections: En defensa del arte (6)\n");
    expect(out).toContain("tags: LIMBICO (2); Arte\n");
    expect(out).toContain("status: draft\n");
    expect(out).not.toContain("### Notes");
    expect(out).not.toContain("### Sources");
  });

  it("widens the verse column for 100+ verses", () => {
    const stanzas = [
      {
        lines: Array.from({ length: 100 }, (_, i) => ({
          kind: "verse" as const,
          n: i + 1,
          text: "x",
        })),
      },
    ];
    const out = renderWork({
      ...work,
      verseCount: 100,
      stanzas,
      notes: [],
      sources: [],
    });
    expect(out).toContain("\n   1  x\n");
    expect(out).toContain("\n 100  x\n");
  });

  it("quotes blank and space-ended description lines without trailing whitespace", () => {
    const sources = [
      {
        kind: "youtube-description" as const,
        date: "2022-04-06",
        text: "Uno \n\nDos",
      },
    ];
    expect(renderWork({ ...work, notes: [], sources })).toContain(
      "  > Uno\n  >\n  > Dos\n",
    );
  });

  it("keeps uncertain-reading markup", () => {
    const stanzas = [
      { lines: [{ kind: "verse" as const, n: 1, text: "lee {?razón}" }] },
    ];
    expect(renderWork({ ...work, verseCount: 1, stanzas })).toContain(
      "  1  lee {?razón}\n",
    );
  });
});

describe("framing", () => {
  const framing =
    "# Uno {{version}}\n\nA {{url}}\n\n## Dos\n\nB\n\n## Tres\n\nC\n";

  it("fills {{placeholders}} and fails on unknown ones", () => {
    expect(
      fillFraming("v {{version}} · {{commit}}", {
        version: "2026.11",
        commit: "abc",
      }),
    ).toBe("v 2026.11 · abc");
    expect(() => fillFraming("{{nope}}", {})).toThrow(/nope/);
  });

  it("abridges to the requested top-level sections, in order", () => {
    expect(abridge(framing, [1, 3])).toBe(
      "# Uno {{version}}\n\nA {{url}}\n\n## Tres\n\nC\n",
    );
  });
});
