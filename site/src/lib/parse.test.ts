import { describe, expect, it } from "vitest";
import { ParseError, parseBody, segments } from "./parse.ts";

describe("parseBody — verses and stanzas", () => {
  it("puts one verse per line and numbers verses from 1", () => {
    const out = parseBody("uno\ndos\ntres\n");
    expect(out.stanzas).toEqual([
      {
        lines: [
          { kind: "verse", n: 1, text: "uno" },
          { kind: "verse", n: 2, text: "dos" },
          { kind: "verse", n: 3, text: "tres" },
        ],
      },
    ]);
    expect(out.verseCount).toBe(3);
    expect(out.firstVerse).toBe("uno");
  });

  it("splits stanzas on a blank line and keeps numbering continuous", () => {
    const out = parseBody("uno\ndos\n\ntres\n");
    expect(
      out.stanzas.map((s) =>
        s.lines.map((l) => (l.kind === "verse" ? l.n : l.name)),
      ),
    ).toEqual([[1, 2], [3]]);
    expect(out.verseCount).toBe(3);
  });

  it("ignores leading and trailing blank lines", () => {
    const out = parseBody("\n\nuno\n\ndos\n\n");
    expect(out.stanzas).toHaveLength(2);
    expect(out.verseCount).toBe(2);
  });

  it("treats CRLF line endings like LF", () => {
    expect(parseBody("uno\r\ndos\r\n\r\ntres\r\n")).toEqual(
      parseBody("uno\ndos\n\ntres\n"),
    );
  });

  it("keeps verse text exactly as written", () => {
    const text = "¿Acaso no es «esto» —dijo— lo que pa’ mí era?";
    expect(parseBody(text).stanzas[0]?.lines[0]).toEqual({
      kind: "verse",
      n: 1,
      text,
    });
  });

  it("returns an empty result for an empty body (draft stub)", () => {
    expect(parseBody("")).toEqual({
      stanzas: [],
      verseCount: 0,
      firstVerse: "",
      uncertain: [],
    });
    expect(parseBody("\n\n")).toEqual({
      stanzas: [],
      verseCount: 0,
      firstVerse: "",
      uncertain: [],
    });
  });

  it("rejects more than one blank line between stanzas", () => {
    expect(() => parseBody("uno\n\n\ndos")).toThrow(ParseError);
  });
});

describe("parseBody — speaker labels", () => {
  it("parses [Name] alone on a line as a label that is not numbered", () => {
    const out = parseBody("uno\n[Els1]\ndos\n");
    expect(out.stanzas[0]?.lines).toEqual([
      { kind: "verse", n: 1, text: "uno" },
      { kind: "label", name: "Els1" },
      { kind: "verse", n: 2, text: "dos" },
    ]);
    expect(out.verseCount).toBe(2);
  });

  it("accepts a label at the start of a stanza", () => {
    const out = parseBody("uno\n\n[Solitario]\ndos");
    expect(out.stanzas[1]?.lines[0]).toEqual({
      kind: "label",
      name: "Solitario",
    });
  });

  it("does not treat brackets inside a verse as a label", () => {
    const out = parseBody("dijo [algo] aquí");
    expect(out.stanzas[0]?.lines[0]).toEqual({
      kind: "verse",
      n: 1,
      text: "dijo [algo] aquí",
    });
  });

  it("rejects a label with no verse after it in its stanza", () => {
    expect(() => parseBody("uno\n[Els1]\n\ndos")).toThrow(ParseError);
    expect(() => parseBody("uno\n[Els1]")).toThrow(ParseError);
  });

  it("rejects an empty label", () => {
    expect(() => parseBody("[]\nuno")).toThrow(ParseError);
  });
});

describe("parseBody — timestamps", () => {
  it("reads @t=N before the first verse of a stanza", () => {
    const out = parseBody("@t=0\nuno\n\n@t=92\ndos");
    expect(out.stanzas.map((s) => s.t)).toEqual([0, 92]);
    expect(out.verseCount).toBe(2);
  });

  it("accepts the timestamp before or after a speaker label", () => {
    expect(parseBody("@t=5\n[Els1]\nuno").stanzas[0]?.t).toBe(5);
    expect(parseBody("[Els1]\n@t=5\nuno").stanzas[0]?.t).toBe(5);
  });

  it("leaves t undefined when the stanza has no timestamp", () => {
    expect(parseBody("uno").stanzas[0]).not.toHaveProperty("t");
  });

  it("rejects a timestamp after the first verse of a stanza", () => {
    expect(() => parseBody("uno\n@t=5\ndos")).toThrow(ParseError);
  });

  it("rejects two timestamps in one stanza", () => {
    expect(() => parseBody("@t=1\n@t=2\nuno")).toThrow(ParseError);
  });

  it("rejects malformed timestamps", () => {
    for (const t of ["@t=", "@t=1.5", "@t=-3", "@t=abc", "@t= 3"]) {
      expect(() => parseBody(`${t}\nuno`), t).toThrow(ParseError);
    }
  });
});

describe("parseBody — uncertain readings", () => {
  it("collects every {?…} with its verse number", () => {
    const out = parseBody(
      "lee {?razón} aquí\n\notra {?dos palabras} y {?tres}",
    );
    expect(out.uncertain).toEqual([
      { verse: 1, text: "razón" },
      { verse: 2, text: "dos palabras" },
      { verse: 2, text: "tres" },
    ]);
  });

  it("keeps the markup in the verse text", () => {
    expect(parseBody("lee {?razón}").stanzas[0]?.lines[0]).toEqual({
      kind: "verse",
      n: 1,
      text: "lee {?razón}",
    });
  });

  it("rejects unclosed, empty, nested or stray markers", () => {
    for (const v of [
      "lee {?razón",
      "lee {?}",
      "lee {?a {?b}}",
      "lee razón}",
      "lee {razón}",
    ]) {
      expect(() => parseBody(v), v).toThrow(ParseError);
    }
  });
});

describe("ParseError", () => {
  it("reports the 1-based body line number", () => {
    try {
      parseBody("uno\ndos\n@t=5\ntres");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).line).toBe(3);
    }
  });
});

describe("segments", () => {
  it("splits a verse into plain and uncertain runs", () => {
    expect(segments("lee {?razón} y {?más} fin")).toEqual([
      { kind: "text", text: "lee " },
      { kind: "uncertain", text: "razón" },
      { kind: "text", text: " y " },
      { kind: "uncertain", text: "más" },
      { kind: "text", text: " fin" },
    ]);
  });

  it("returns one text run when there is no markup", () => {
    expect(segments("uno")).toEqual([{ kind: "text", text: "uno" }]);
  });
});
