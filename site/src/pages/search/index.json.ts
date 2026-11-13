// Search index, generated at build. Public works only.
import type { APIRoute } from "astro";
import { loadEdition } from "../../lib/edition.ts";
import { plainText } from "../../lib/parse.ts";
import { buildSearchData } from "../../lib/search.ts";
import { seriesTitle } from "../../lib/series.ts";

export const GET: APIRoute = async () => {
  const edition = await loadEdition();
  const data = buildSearchData(
    edition.works
      .filter((w) => w.public)
      .map((w) => ({
        id: w.id,
        title: w.meta.title,
        author: w.author.name,
        authorId: w.author.id,
        url: w.url,
        collections: (w.meta.collections ?? []).map((c) => c.id),
        tags: (w.meta.tags ?? []).map((t) => t.id),
        marks: [
          ...(w.meta.collections ?? []).map((m) => ({
            title: seriesTitle(edition, "collections", m.id),
            position: m.position,
          })),
          ...(w.meta.tags ?? []).map((m) => ({
            title: seriesTitle(edition, "tags", m.id),
            position: m.position,
          })),
        ],
        verses: w.stanzas
          .flatMap((s) => s.lines)
          .flatMap((l) => (l.kind === "verse" ? [plainText(l.text)] : [])),
      })),
  );
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};
