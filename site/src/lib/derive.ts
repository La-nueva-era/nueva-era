// Derived relations between works. Pure, computed at build.
// Hidden works are never linked from other works.

import { normalize } from "./normalize.ts";

type Membership = { id: string; position?: number | undefined };

export type DeriveWork = {
  id: string;
  author: string;
  title: string;
  public: boolean;
  published: string;
  collections: Membership[];
  tags: Membership[];
  related: string[];
  /** The work's verses as plain text. */
  text: string;
};

type Neighbour = { id: string; position?: number };
export type Neighbours = {
  kind: "collections" | "tags";
  id: string;
  prev?: Neighbour;
  next?: Neighbour;
};

export type Derived = {
  neighbours: Neighbours[];
  /** Public works whose `related` lists this one. */
  relatedFrom: string[];
  /** Public works whose text contains this work's title. */
  mentionedIn: string[];
  /** Ids of other authors whose name appears in this work's text. */
  mentionsAuthors: string[];
};

const letter = "[\\p{L}\\p{N}]";
const words = (s: string) => normalize(s).replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeWord = (needle: string) =>
  new RegExp(`(?<!${letter})${escape(words(needle))}(?!${letter})`, "u");

export function derive(
  works: DeriveWork[],
  authors: { id: string; name: string }[],
): Map<string, Derived> {
  const visible = works.filter((w) => w.public);
  const texts = new Map(works.map((w) => [w.id, words(w.text)]));
  const out = new Map<string, Derived>();

  for (const work of works) {
    const neighbours: Neighbours[] = [];
    for (const kind of ["collections", "tags"] as const) {
      for (const m of work[kind]) {
        const members = visible
          .flatMap((o) =>
            o[kind]
              .filter((x) => x.id === m.id)
              .map((x) => ({ work: o, position: x.position })),
          )
          .sort((a, b) =>
            a.position !== undefined && b.position !== undefined
              ? a.position - b.position
              : a.work.published.localeCompare(b.work.published),
          );
        const i = members.findIndex((x) => x.work.id === work.id);
        const at = (j: number): Neighbour | undefined => {
          const x = members[j];
          if (!x || i === -1) return undefined;
          return x.position === undefined
            ? { id: x.work.id }
            : { id: x.work.id, position: x.position };
        };
        const prev = at(i - 1);
        const next = at(i + 1);
        neighbours.push({
          kind,
          id: m.id,
          ...(prev ? { prev } : {}),
          ...(next ? { next } : {}),
        });
      }
    }

    const title = wholeWord(work.title);
    const own = texts.get(work.id) ?? "";
    out.set(work.id, {
      neighbours,
      relatedFrom: visible
        .filter((o) => o.related.includes(work.id))
        .map((o) => o.id),
      mentionedIn: visible
        .filter((o) => o.id !== work.id && title.test(texts.get(o.id) ?? ""))
        .map((o) => o.id),
      mentionsAuthors: authors
        .filter((a) => a.id !== work.author && wholeWord(a.name).test(own))
        .map((a) => a.id),
    });
  }
  return out;
}
