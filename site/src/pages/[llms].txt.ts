// /llms.txt (index, llmstxt.org shape) and /llms-full.txt (framing + corpus).
// Generated only once the framing document exists.
import type { APIRoute } from "astro";
import { es } from "../i18n/es.ts";
import { loadEdition } from "../lib/edition.ts";
import {
  framingSummary,
  hasFraming,
  packFile,
  textResponse,
} from "../lib/packs.ts";
import { SITE_NAME, SITE_URL } from "../site.config.ts";

export function getStaticPaths() {
  return hasFraming
    ? [{ params: { llms: "llms" } }, { params: { llms: "llms-full" } }]
    : [];
}

export const GET: APIRoute = async ({ params }) => {
  const edition = await loadEdition();
  if (params.llms === "llms-full") {
    return textResponse(
      await packFile(edition.works.filter((w) => w.public)),
      "text/plain",
    );
  }
  const url = (path: string) => new URL(path, SITE_URL).href;
  const link = (path: string, label: string) => `- [${label}](${url(path)})`;
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${await framingSummary()}`,
    "",
    `## ${es.pack.files}`,
    "",
    link("/llms-full.txt", es.pack.full),
    ...edition.authors.map((a) =>
      link(`/pack/${a.id}.md`, es.pack.author(a.name)),
    ),
    ...edition.collections.map((c) =>
      link(`/pack/colecciones/${c.id}.md`, es.pack.collection(c.title)),
    ),
    ...edition.tags.map((t) =>
      link(`/pack/etiquetas/${t.id}.md`, es.pack.tag(t.title)),
    ),
    "",
    `## ${es.pack.works}`,
    "",
    ...edition.works
      .filter((w) => w.public)
      .map((w) => link(`${w.url}.md`, `${w.author.name} — ${w.meta.title}`)),
    "",
  ];
  return textResponse(lines.join("\n"), "text/plain");
};
