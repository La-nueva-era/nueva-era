// The whole edition, loaded once per build: content collections + parsed
// bodies + derived relations. Pages read from here, never from getCollection.

import { getCollection } from "astro:content";
import type { Author, Collection, Tag, WorkMeta } from "./schema.ts";
import { parseBody, plainText, type ParsedBody } from "./parse.ts";
import { derive, type Derived } from "./derive.ts";
import { AUTHOR_ORDER } from "../site.config.ts";
import type { Citable } from "./cite.ts";
import {
  parseFragments,
  resolveFragments,
  type Fragment,
} from "./fragments.ts";

export type Work = ParsedBody & {
  id: string;
  slug: string;
  url: string;
  meta: WorkMeta;
  author: Author;
  public: boolean;
  /** First collection, used for citations. */
  citable: Citable;
  derived: Derived;
};

export type Edition = {
  authors: Author[];
  collections: Collection[];
  tags: Tag[];
  /** Every work, hidden included, by publication date. */
  works: Work[];
  byId: Map<string, Work>;
  /** Verses the editor features on the home page, in order. */
  fragments: Fragment[];
};

// Optional: without the file the home page simply shows no verses.
const fragmentsFile = Object.values(
  import.meta.glob<string>("../../../content/fragments.yaml", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
)[0];

let cache: Promise<Edition> | undefined;

export function loadEdition(): Promise<Edition> {
  cache ??= build();
  return cache;
}

async function build(): Promise<Edition> {
  const rank = (id: string) => {
    const i = AUTHOR_ORDER.indexOf(id);
    return i === -1 ? AUTHOR_ORDER.length : i;
  };
  const authors = (await getCollection("authors"))
    .map((e) => e.data)
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
  const collections = (await getCollection("collections")).map((e) => e.data);
  const tags = (await getCollection("tags")).map((e) => e.data);
  const entries = await getCollection("works");

  const authorById = new Map(authors.map((a) => [a.id, a]));
  const collectionById = new Map(collections.map((c) => [c.id, c]));

  const base = entries
    .map((e) => {
      const author = authorById.get(e.data.author);
      if (!author)
        throw new Error(`${e.id}: unknown author «${e.data.author}»`);
      const parsed = parseBody(e.body ?? "");
      const first = e.data.collections?.[0];
      const collection = first ? collectionById.get(first.id) : undefined;
      return {
        ...parsed,
        id: e.id,
        slug: e.id.split("/")[1] ?? e.id,
        url: `/${e.id}`,
        meta: e.data,
        author,
        public: e.data.visibility === "public",
        citable: {
          author: author.name,
          title: e.data.title,
          collection:
            collection && first
              ? { title: collection.title, position: first.position }
              : undefined,
        },
      };
    })
    .sort(
      (a, b) =>
        a.meta.youtube.published.localeCompare(b.meta.youtube.published) ||
        a.id.localeCompare(b.id),
    );

  const derived = derive(
    base.map((w) => ({
      id: w.id,
      author: w.meta.author,
      title: w.meta.title,
      public: w.public,
      published: w.meta.youtube.published,
      collections: w.meta.collections ?? [],
      tags: w.meta.tags ?? [],
      related: w.meta.related ?? [],
      text: w.stanzas
        .flatMap((s) => s.lines)
        .map((l) => (l.kind === "verse" ? plainText(l.text) : ""))
        .join("\n"),
    })),
    authors,
  );

  const works: Work[] = base.map((w) => {
    const d = derived.get(w.id);
    if (!d) throw new Error(`${w.id}: missing derived data`);
    return { ...w, derived: d };
  });

  const byId = new Map(works.map((w) => [w.id, w]));
  const fragments = fragmentsFile
    ? resolveFragments(
        parseFragments(fragmentsFile),
        new Map(
          works.map((w) => [
            w.id,
            {
              title: w.meta.title,
              url: w.url,
              public: w.public,
              verses: w.stanzas
                .flatMap((s) => s.lines)
                .flatMap((l) => (l.kind === "verse" ? [l.text] : [])),
            },
          ]),
        ),
      )
    : [];

  return { authors, collections, tags, works, byId, fragments };
}
