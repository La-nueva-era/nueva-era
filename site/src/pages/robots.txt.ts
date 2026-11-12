// robots.txt: everything allowed, AI crawlers included. Pack files stay out
// of search results through their noindex header (_headers), which crawlers
// can only see if they are allowed to fetch them.
import type { APIRoute } from "astro";
import { SITE_URL } from "../site.config.ts";

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL("/sitemap-index.xml", SITE_URL).href}
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
