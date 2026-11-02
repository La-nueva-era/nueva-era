// Search (SPEC §10). One MiniSearch index of verses and of works (title and
// first verse), built at build time and loaded lazily in the browser.
// Shared by the build (buildSearchData) and the client (loadIndex & co).

import MiniSearch, { type SearchResult } from "minisearch";
import { normalize } from "./normalize.ts";

/** What the build provides per public work. */
export type SearchWork = {
  id: string;
  title: string;
  author: string;
  authorId: string;
  url: string;
  collections: string[];
  tags: string[];
  /** Series marks for suggestions: collection/tag title and position. */
  marks: { title: string; position?: number | undefined }[];
  /** Verse texts in order; verse n is verses[n - 1]. */
  verses: string[];
};

export type SearchData = {
  index: unknown;
  works: Record<string, SearchWork>;
};

type Doc =
  | { id: string; type: "verse"; work: string; n: number; text: string }
  | { id: string; type: "work"; work: string; title: string; first: string };

export type Loaded = {
  mini: MiniSearch<Doc>;
  works: Record<string, SearchWork>;
};
export type VerseHit = { work: string; n: number; score: number };
export type Filters = {
  author?: string | undefined;
  collection?: string | undefined;
  tag?: string | undefined;
};

const OPTIONS = {
  fields: ["text", "title", "first"],
  storeFields: ["type", "work", "n"],
  // Accent and case folding; ñ folds to n, so "año" and "ano" find each other.
  processTerm: (term: string) => normalize(term),
};

const long = (term: string) => term.length >= 4;

export function buildSearchData(works: SearchWork[]): SearchData {
  const mini = new MiniSearch<Doc>(OPTIONS);
  mini.addAll(
    works.flatMap((w): Doc[] => [
      {
        id: w.id,
        type: "work",
        work: w.id,
        title: w.title,
        first: w.verses[0] ?? "",
      },
      ...w.verses.map((text, i): Doc => ({
        id: `${w.id}#${i + 1}`,
        type: "verse",
        work: w.id,
        n: i + 1,
        text,
      })),
    ]),
  );
  return {
    index: mini.toJSON(),
    works: Object.fromEntries(works.map((w) => [w.id, w])),
  };
}

export function loadIndex(json: string): Loaded {
  const data = JSON.parse(json) as SearchData;
  return {
    mini: MiniSearch.loadJSON<Doc>(JSON.stringify(data.index), OPTIONS),
    works: data.works,
  };
}

/** Verse-level search: every word must match; prefix and fuzzy (distance 1) for words of 4+ characters. */
export function searchVerses(
  loaded: Loaded,
  query: string,
  filters: Filters = {},
): VerseHit[] {
  if (!query.trim()) return [];
  const keep = (r: SearchResult) => {
    if (r.type !== "verse") return false;
    const w = loaded.works[r.work as string];
    if (!w) return false;
    if (filters.author && w.authorId !== filters.author) return false;
    if (filters.collection && !w.collections.includes(filters.collection))
      return false;
    if (filters.tag && !w.tags.includes(filters.tag)) return false;
    return true;
  };
  return loaded.mini
    .search(query, {
      fields: ["text"],
      combineWith: "AND",
      prefix: long,
      fuzzy: (term) => (long(term) ? 1 : false),
      filter: keep,
    })
    .map((r) => ({ work: r.work as string, n: r.n as number, score: r.score }));
}

/** Header suggestions: works whose title or first verse match by prefix. */
export function suggest(
  loaded: Loaded,
  query: string,
  limit = 6,
): { work: string }[] {
  if (!query.trim()) return [];
  return loaded.mini
    .search(query, {
      fields: ["title", "first"],
      combineWith: "AND",
      prefix: true,
      boost: { title: 2 },
      filter: (r) => r.type === "work",
    })
    .slice(0, limit)
    .map((r) => ({ work: r.work as string }));
}

/** Splits a text into runs, marking the words that match the query. */
export function highlight(
  text: string,
  query: string,
): { text: string; hit: boolean }[] {
  const terms = normalize(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const matches = (word: string) => {
    const w = normalize(word);
    return terms.some((t) => w === t || (long(t) && w.startsWith(t)));
  };
  const out: { text: string; hit: boolean }[] = [];
  const push = (t: string, hit: boolean) => {
    const last = out.at(-1);
    if (last && last.hit === hit && !hit) last.text += t;
    else out.push({ text: t, hit });
  };
  let i = 0;
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    if (m.index > i) push(text.slice(i, m.index), false);
    push(m[0], matches(m[0]));
    i = m.index + m[0].length;
  }
  if (i < text.length) push(text.slice(i), false);
  return out;
}
