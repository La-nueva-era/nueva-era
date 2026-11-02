// One author's complete works, chronological (SPEC §9.2).
import type { APIRoute } from "astro";
import { loadEdition } from "../../lib/edition.ts";
import { hasFraming, packFile, textResponse } from "../../lib/packs.ts";

export async function getStaticPaths() {
  if (!hasFraming) return [];
  const { authors } = await loadEdition();
  return authors.map((a) => ({ params: { author: a.id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const { works } = await loadEdition();
  return textResponse(
    await packFile(
      works.filter((w) => w.public && w.meta.author === params.author),
    ),
  );
};
