// robots.txt (SPEC §9.2, §12): everything allowed, AI crawlers included,
// except the pack files, which are for deliberate fetching only.
import type { APIRoute } from "astro";
import { SITE_URL } from "../site.config.ts";

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /pack/
Disallow: /*.md$
Disallow: /llms.txt
Disallow: /llms-full.txt

Sitemap: ${new URL("/sitemap-index.xml", SITE_URL).href}
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
