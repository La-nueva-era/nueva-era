// RSS of newly reviewed works, newest review first.
import type { APIRoute } from "astro";
import { es } from "../i18n/es.ts";
import { loadEdition } from "../lib/edition.ts";
import { plainText } from "../lib/parse.ts";
import { SITE_NAME, SITE_URL } from "../site.config.ts";

const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const { works } = await loadEdition();
  const reviewed = works
    .filter(
      (w) =>
        w.public && w.meta.status === "reviewed" && w.meta.edition?.reviewed_on,
    )
    .sort((a, b) =>
      (b.meta.edition?.reviewed_on ?? "").localeCompare(
        a.meta.edition?.reviewed_on ?? "",
      ),
    );
  const items = reviewed
    .map((w) => {
      const url = new URL(w.url, SITE_URL).href;
      const date = new Date(
        `${w.meta.edition?.reviewed_on}T00:00:00Z`,
      ).toUTCString();
      return `    <item>
      <title>${xml(`«${w.meta.title}» — ${w.author.name}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${xml(w.firstVerse ? `${plainText(w.firstVerse)}…` : "")}</description>
    </item>`;
    })
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${xml(es.rss.description)}</description>
    <language>es</language>
${items}
  </channel>
</rss>
`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
};
