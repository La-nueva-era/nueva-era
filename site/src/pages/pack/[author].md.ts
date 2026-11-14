// One author's complete works, chronological.
import type { APIRoute } from "astro";
import { loadEdition } from "../../lib/edition.ts";
import { authorPack, hasFraming, textResponse } from "../../lib/packs.ts";

export async function getStaticPaths() {
  if (!hasFraming) return [];
  const { authors } = await loadEdition();
  return authors.map((a) => ({ params: { author: a.id } }));
}

export const GET: APIRoute = async ({ params }) =>
  textResponse(await authorPack(params.author ?? ""));
