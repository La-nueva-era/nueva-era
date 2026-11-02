import type { APIRoute } from "astro";
import { loadEdition } from "../lib/edition.ts";
import { sitemapPaths } from "../lib/urls.ts";
import { SITE_URL } from "../site.config.ts";

export const GET: APIRoute = async () => {
  const urls = sitemapPaths(await loadEdition())
    .map((p) => `  <url><loc>${new URL(p, SITE_URL).href}</loc></url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
