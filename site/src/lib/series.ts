// Collections and tags share URLs and lookups.
import type { Edition, Work } from "./edition.ts";

export type SeriesKind = "collections" | "tags";

export const seriesUrl = (kind: SeriesKind, id: string) =>
  `/${kind === "collections" ? "colecciones" : "etiquetas"}/${id}`;

export const seriesTitle = (edition: Edition, kind: SeriesKind, id: string) =>
  edition[kind].find((s) => s.id === id)?.title ?? id;

/** Public works of a series, by position, or by date when unordered. */
export function seriesWorks(
  edition: Edition,
  kind: SeriesKind,
  id: string,
): Work[] {
  const pos = (w: Work) => w.meta[kind]?.find((m) => m.id === id)?.position;
  return edition.works
    .filter((w) => w.public && (w.meta[kind] ?? []).some((m) => m.id === id))
    .sort((a, b) => {
      const [pa, pb] = [pos(a), pos(b)];
      return pa !== undefined && pb !== undefined
        ? pa - pb
        : a.meta.youtube.published.localeCompare(b.meta.youtube.published);
    });
}
