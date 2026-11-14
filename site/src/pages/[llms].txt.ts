// /llms.txt (index, llmstxt.org shape) and /llms-full.txt (framing + corpus).
// Generated only once the framing document exists.
import type { APIRoute } from "astro";
import { es } from "../i18n/es.ts";
import { loadEdition } from "../lib/edition.ts";
import { approxTokens } from "../lib/pack.ts";
import {
  authorPack,
  framingSummary,
  fullPack,
  hasFraming,
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
    return textResponse(await fullPack(), "text/plain");
  }
  const url = (path: string) => new URL(path, SITE_URL).href;
  const link = (path: string, label: string, notes?: string) =>
    `- [${label}](${url(path)})${notes ? `: ${notes}` : ""}`;
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${await framingSummary()}`,
    "",
    `## ${es.pack.files}`,
    "",
    link("/llms-full.txt", es.pack.full, approxTokens(await fullPack())),
    ...(await Promise.all(
      edition.authors.map(async (a) =>
        link(
          `/pack/${a.id}.md`,
          es.pack.author(a.name),
          approxTokens(await authorPack(a.id)),
        ),
      ),
    )),
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
