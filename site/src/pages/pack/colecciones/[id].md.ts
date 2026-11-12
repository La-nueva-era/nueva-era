// One collection in order.
import type { APIRoute } from "astro";
import { loadEdition } from "../../../lib/edition.ts";
import { hasFraming, packFile, textResponse } from "../../../lib/packs.ts";
import { seriesWorks } from "../../../lib/series.ts";

export async function getStaticPaths() {
  if (!hasFraming) return [];
  const edition = await loadEdition();
  return edition.collections.map((s) => ({ params: { id: s.id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const edition = await loadEdition();
  return textResponse(
    await packFile(seriesWorks(edition, "collections", params.id ?? "")),
  );
};
