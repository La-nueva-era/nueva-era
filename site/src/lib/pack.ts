import type { Line, Stanza } from "./parse.ts";

type Series = { title: string; position?: number | undefined };
type Source =
  | { kind: "youtube-description"; date: string; text: string }
  | {
      kind: "community-post" | "patreon";
      title: string;
      url: string;
      date: string;
    }
  | { kind: "external"; title: string; url: string; date?: string | undefined };

export type PackWork = {
  id: string;
  author: string;
  title: string;
  url: string;
  youtubeId: string;
  published: string;
  collections: Series[];
  tags: Series[];
  status: "draft" | "reviewed";
  reviewedOn?: string | undefined;
  verseCount: number;
  stanzas: Stanza[];
  notes: { verse?: number | undefined; text: string }[];
  sources: Source[];
};

const series = (list: Series[]) =>
  list.length === 0
    ? "—"
    : list
        .map((s) =>
          s.position === undefined ? s.title : `${s.title} (${s.position})`,
        )
        .join("; ");

function line(l: Line, width: number): string {
  if (l.kind === "label") return `${" ".repeat(width - 2)}[${l.name}]`;
  if (l.kind === "voice")
    return `${" ".repeat(width - 2)}[${l.voice ?? "Narrador"}]`;
  return `${String(l.n).padStart(width)}  ${l.text}`;
}

function source(s: Source): string[] {
  switch (s.kind) {
    case "youtube-description":
      return [
        `- YouTube description (${s.date}):`,
        ...s.text
          .replace(/\n+$/, "")
          .split("\n")
          .map((t) => `  >${t.trimEnd() ? ` ${t.trimEnd()}` : ""}`),
      ];
    case "community-post":
      return [`- Community post (${s.date}): ${s.url}`];
    case "patreon":
      return [`- Patreon (${s.date}, subscribers): ${s.url}`];
    case "external":
      return [`- External link${s.date ? ` (${s.date})` : ""}: ${s.url}`];
  }
}

/** One work in pack form, ending with a newline. */
export function renderWork(w: PackWork): string {
  // The number column is at least 3 wide ("  1"), one more than the widest number.
  const width = Math.max(3, String(w.verseCount).length + 1);
  const out = [
    `## ${w.author} — ${w.title}`,
    `id: ${w.id}`,
    `url: ${w.url}`,
    `video: https://www.youtube.com/watch?v=${w.youtubeId}`,
    `published: ${w.published}`,
    `collections: ${series(w.collections)}`,
    `tags: ${series(w.tags)}`,
    `status: ${w.status === "reviewed" && w.reviewedOn ? `reviewed (${w.reviewedOn})` : w.status}`,
    `verses: ${w.verseCount}`,
  ];
  for (const stanza of w.stanzas)
    out.push("", ...stanza.lines.map((l) => line(l, width)));
  if (w.notes.length > 0) {
    out.push("", "### Notes");
    for (const n of w.notes)
      out.push(
        `- ${n.verse === undefined ? "" : `v. ${n.verse}: `}${n.text.trim()}`,
      );
  }
  if (w.sources.length > 0) {
    out.push("", "### Sources");
    for (const s of w.sources) out.push(...source(s));
  }
  return `${out.join("\n")}\n`;
}

/** Replaces {{name}} placeholders; an unknown placeholder is an error, never left in place. */
export function fillFraming(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined)
      throw new Error(`framing: unknown placeholder {{${name}}}`);
    return v;
  });
}

/** Keeps only the given 1-based top-level sections (split at "# " and "## " headings). */
export function abridge(text: string, keep: number[]): string {
  const sections: string[] = [];
  for (const l of text.split(/(?<=\n)/)) {
    if (/^#{1,2} /.test(l) || sections.length === 0) sections.push(l);
    else sections[sections.length - 1] += l;
  }
  return keep.map((i) => sections[i - 1] ?? "").join("");
}
