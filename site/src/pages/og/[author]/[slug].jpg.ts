// Share image of a work, hidden ones included (their pages exist). Only works
// whose thumbnail can be fetched get one; the others share the default card.
import type { APIRoute } from "astro";
import { loadEdition } from "../../../lib/edition.ts";
import { renderOg, workArt } from "../../../lib/og.ts";

export async function getStaticPaths() {
  const { works } = await loadEdition();
  const arts = await Promise.all(works.map((w) => workArt(w.meta.youtube.id)));
  return works
    .filter((_, i) => arts[i] !== undefined)
    .map((w) => ({
      params: { author: w.meta.author, slug: w.slug },
      props: { id: w.id },
    }));
}

export const GET: APIRoute = async ({ props }) => {
  const edition = await loadEdition();
  const work = edition.byId.get((props as { id: string }).id);
  const art = work && (await workArt(work.meta.youtube.id));
  if (!work || !art) return new Response(null, { status: 404 });
  const jpeg = await renderOg({
    kind: "work",
    title: work.meta.title,
    author: work.author.name,
    series: work.citable.collection,
    art,
  });
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg" },
  });
};
