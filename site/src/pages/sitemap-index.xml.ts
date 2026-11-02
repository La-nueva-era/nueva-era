// Sitemap index (SPEC §12) pointing at the single sitemap.
import type { APIRoute } from "astro";
import { SITE_URL } from "../site.config.ts";

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${new URL("/sitemap-0.xml", SITE_URL).href}</loc></sitemap>
</sitemapindex>
`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
