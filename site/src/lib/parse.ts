// Body → stanzas/verses. SPEC §6. Pure; no I/O.
//
// Grammar, one item per line:
//   verse      any non-blank line that is not a label or a timestamp
//   blank      exactly one separates stanzas
//   [Name]     speaker label; not numbered
//   @t=N       stanza timestamp in whole seconds; before the stanza's first verse
// Inside a verse, {?…} marks an uncertain reading (EDITORIAL §7).
// Anything else is rejected with a ParseError carrying the body line number.

export type Line =
  { kind: "verse"; n: number; text: string } | { kind: "label"; name: string };
export type Stanza = { t?: number; lines: Line[] };
export type ParsedBody = {
  stanzas: Stanza[];
  verseCount: number;
  firstVerse: string;
  uncertain: { verse: number; text: string }[];
};
export type Segment = { kind: "text" | "uncertain"; text: string };

export class ParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(`line ${line}: ${message}`);
    this.name = "ParseError";
  }
}

const LABEL = /^\[(.*)\]$/;
const TIMESTAMP = /^@t=(.*)$/;
const SECONDS = /^(0|[1-9]\d*)$/;

export function parseBody(body: string): ParsedBody {
  const rows = body.replace(/\r\n/g, "\n").split("\n");
  const stanzas: Stanza[] = [];
  const uncertain: ParsedBody["uncertain"] = [];
  let n = 0;
  let stanza: Stanza | null = null;
  let hasVerse = false;
  let blanks = 0;

  const close = (line: number) => {
    if (!stanza) return;
    if (stanza.lines.at(-1)?.kind === "label") {
      throw new ParseError("speaker label must be followed by a verse", line);
    }
    if (!hasVerse) throw new ParseError("stanza has no verses", line);
    stanzas.push(stanza);
    stanza = null;
  };

  rows.forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === "") {
      if (stanza) close(line - 1);
      if (stanzas.length > 0) blanks++;
      return;
    }
    if (blanks > 1)
      throw new ParseError("more than one blank line between stanzas", line);
    blanks = 0;

    if (!stanza) {
      stanza = { lines: [] };
      hasVerse = false;
    }

    const ts = TIMESTAMP.exec(raw);
    if (ts) {
      const value = ts[1] ?? "";
      if (!SECONDS.test(value))
        throw new ParseError(`malformed timestamp «${raw}»`, line);
      if (hasVerse)
        throw new ParseError(
          "timestamp must come before the stanza's first verse",
          line,
        );
      if (stanza.t !== undefined)
        throw new ParseError("stanza has more than one timestamp", line);
      stanza.t = Number(value);
      return;
    }

    const label = LABEL.exec(raw);
    if (label) {
      const name = (label[1] ?? "").trim();
      if (name === "") throw new ParseError("empty speaker label", line);
      stanza.lines.push({ kind: "label", name });
      return;
    }

    let parts: Segment[];
    try {
      parts = segments(raw);
    } catch (e) {
      throw new ParseError((e as Error).message, line);
    }
    n++;
    hasVerse = true;
    for (const p of parts)
      if (p.kind === "uncertain") uncertain.push({ verse: n, text: p.text });
    stanza.lines.push({ kind: "verse", n, text: raw });
  });
  close(rows.length);

  const first = stanzas[0]?.lines.find((l) => l.kind === "verse");
  return {
    stanzas,
    verseCount: n,
    firstVerse: first?.kind === "verse" ? first.text : "",
    uncertain,
  };
}

/** Splits a verse into plain runs and {?…} uncertain runs. Throws on malformed markup. */
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    const stray = text.indexOf("}", i);
    if (stray !== -1 && (open === -1 || stray < open))
      throw new Error("stray «}»");
    if (open === -1) {
      out.push({ kind: "text", text: text.slice(i) });
      break;
    }
    if (text[open + 1] !== "?")
      throw new Error("«{» must open an uncertain reading «{?…}»");
    const end = text.indexOf("}", open);
    if (end === -1) throw new Error("unclosed uncertain reading");
    const inner = text.slice(open + 2, end);
    if (inner.includes("{")) throw new Error("nested uncertain reading");
    if (inner.trim() === "") throw new Error("empty uncertain reading");
    if (open > i) out.push({ kind: "text", text: text.slice(i, open) });
    out.push({ kind: "uncertain", text: inner });
    i = end + 1;
  }
  return out;
}
