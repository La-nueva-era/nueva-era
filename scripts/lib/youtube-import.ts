// Pure helpers for scripts/import-youtube.ts (SPEC §13).

import { parse as parseYaml, stringify } from "yaml";

/** The yt-dlp fields the importer uses. */
export type Video = {
  id: string;
  title: string;
  upload_date: string;
  description: string;
};

/** Kebab-case ASCII slug derived from a title (SPEC §5.4). */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A draft stub for a video: hidden, empty body, description kept verbatim as a
 * source. The title is the video title as published; the editor fixes it.
 */
export function stubFor(
  video: Video,
  author: string,
): { path: string; text: string } {
  const d = video.upload_date;
  const published = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const meta: Record<string, unknown> = {
    title: video.title,
    author,
    youtube: { id: video.id, published },
    status: "draft",
    visibility: "hidden",
  };
  if (video.description.trim() !== "") {
    meta.sources = [
      { kind: "youtube-description", date: published, text: video.description },
    ];
  }
  const front = stringify(meta, { lineWidth: 0, blockQuote: "literal" });
  return {
    path: `${author}/${slugify(video.title)}.md`,
    text: `---\n${front}---\n`,
  };
}

/** youtube.id of every work file given, `_` files included, so nothing is imported twice. */
export function existingVideoIds(files: Record<string, string>): Set<string> {
  const ids = new Set<string>();
  for (const text of Object.values(files)) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
    if (!fm) continue;
    try {
      const id = (
        parseYaml(fm[1] ?? "") as { youtube?: { id?: unknown } } | null
      )?.youtube?.id;
      if (typeof id === "string") ids.add(id);
    } catch {
      // Malformed front matter is the content lint's business, not the importer's.
    }
  }
  return ids;
}
