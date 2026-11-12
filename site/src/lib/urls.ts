// Every indexable page of the site, for the sitemap. Hidden works and
// noindex pages (/buscar, pack files) are left out.
import type { Edition } from "./edition.ts";
import { seriesUrl } from "./series.ts";

export function sitemapPaths(edition: Edition): string[] {
  return [
    "/",
    ...edition.authors.map((a) => `/${a.id}`),
    ...edition.works.filter((w) => w.public).map((w) => w.url),
    "/colecciones",
    ...edition.collections.map((c) => seriesUrl("collections", c.id)),
    "/etiquetas",
    ...edition.tags.map((t) => seriesUrl("tags", t.id)),
    "/cronologia",
    "/indice/titulos",
    "/indice/primeros-versos",
  ];
}
