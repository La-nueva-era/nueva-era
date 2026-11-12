// Assembles pack files from the edition. The framing document is
// the editor's text at site/src/pack/framing.md; until it exists no pack file
// is generated.

import { loadEdition, type Edition, type Work } from "./edition.ts";
import { abridge, fillFraming, renderWork, type PackWork } from "./pack.ts";
import { seriesTitle, seriesWorks, type SeriesKind } from "./series.ts";
import { edition as version } from "./version.ts";
import { SITE_URL } from "../site.config.ts";

const files = import.meta.glob<string>("../pack/framing.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const framingSource = Object.values(files)[0];
if (framingSource === undefined) {
  console.warn(
    "[pack] site/src/pack/framing.md does not exist yet: no pack file is generated.",
  );
}

/** Framing items kept in a single work's twin. */
const ABRIDGED = [1, 3, 6, 7];

export const hasFraming = framingSource !== undefined;

function toPackWork(edition: Edition, w: Work): PackWork {
  const series = (kind: SeriesKind) =>
    (w.meta[kind] ?? []).map((m) => ({
      title: seriesTitle(edition, kind, m.id),
      position: m.position,
    }));
  return {
    id: w.id,
    author: w.author.name,
    title: w.meta.title,
    url: new URL(w.url, SITE_URL).href,
    youtubeId: w.meta.youtube.id,
    published: w.meta.youtube.published,
    collections: series("collections"),
    tags: series("tags"),
    status: w.meta.status,
    reviewedOn: w.meta.edition?.reviewed_on,
    verseCount: w.verseCount,
    stanzas: w.stanzas,
    notes: w.meta.notes ?? [],
    sources: w.meta.sources ?? [],
  };
}

function placeholders(edition: Edition): Record<string, string> {
  const years = (a: Edition["authors"][number]) =>
    [a.born, a.died]
      .filter((y) => y !== undefined && y !== null)
      .map((y) => String(y).slice(0, 4))
      .join("–");
  const list = (kind: SeriesKind) =>
    edition[kind]
      .map((s) => {
        const works = seriesWorks(edition, kind, s.id).map((w) => {
          const pos = w.meta[kind]?.find((m) => m.id === s.id)?.position;
          return `  ${pos === undefined ? "-" : `${pos}.`} ${w.meta.title}`;
        });
        return [
          `- ${s.title} (${edition.authors.find((a) => a.id === s.author)?.name ?? s.author})`,
          ...works,
        ].join("\n");
      })
      .join("\n") || "—";
  return {
    version: version.version ?? "—",
    commit: version.commit,
    date: version.date,
    url: SITE_URL,
    authors: edition.authors
      .map(
        (a) =>
          `- ${a.name}${a.alias ? ` (${a.alias})` : ""}${years(a) ? `, ${years(a)}` : ""}${a.bio ? `: ${a.bio.trim()}` : ""}`,
      )
      .join("\n"),
    collections: list("collections"),
    tags: list("tags"),
  };
}

async function framing(abridged: boolean): Promise<string> {
  if (framingSource === undefined) throw new Error("framing.md is missing");
  const edition = await loadEdition();
  const text = abridged ? abridge(framingSource, ABRIDGED) : framingSource;
  return fillFraming(text, placeholders(edition));
}

/** A pack file: framing, then each work. */
export async function packFile(
  works: Work[],
  abridged = false,
): Promise<string> {
  const edition = await loadEdition();
  const body = works.map((w) => renderWork(toPackWork(edition, w))).join("\n");
  return `${(await framing(abridged)).trimEnd()}\n\n---\n\n${body}`;
}

/** The first paragraph after the first heading of the framing: the llms.txt summary. */
export async function framingSummary(): Promise<string> {
  const first = abridge(await framing(false), [1]);
  return (
    first
      .split(/\n\s*\n/)
      .find((p) => p.trim() && !p.startsWith("#"))
      ?.trim() ?? ""
  );
}

export const textResponse = (body: string, type = "text/markdown") =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8` } });
