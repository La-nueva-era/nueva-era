// Plain-text twin of a work page (SPEC §7, §9.2): abridged framing + the work.
import type { APIRoute } from "astro";
import { loadEdition } from "../../lib/edition.ts";
import { hasFraming, packFile, textResponse } from "../../lib/packs.ts";

export async function getStaticPaths() {
  if (!hasFraming) return [];
  const { works } = await loadEdition();
  return works.map((w) => ({
    params: { author: w.meta.author, slug: w.slug },
    props: { id: w.id },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const edition = await loadEdition();
  const work = edition.byId.get((props as { id: string }).id);
  if (!work) return new Response(null, { status: 404 });
  return textResponse(await packFile([work], true));
};
